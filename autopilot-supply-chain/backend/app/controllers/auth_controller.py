"""Auth controller – registration, login, MFA, token refresh, Google OAuth."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import redis
import structlog

from app.core.database import get_db
from app.core.config import settings
from app.services.auth_service import AuthService
from app.schemas.auth_schemas import (
    RegisterRequest, LoginRequest, MFAVerifyRequest,
    TokenResponse, RefreshRequest, MFASetupResponse, UserResponse,
)
from app.middlewares.auth_middleware import get_current_user

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_redis():
    r = redis.from_url(settings.REDIS_URL, decode_responses=False)
    try:
        yield r
    finally:
        r.close()


@router.post("/register", response_model=MFASetupResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db), r=Depends(get_redis)):
    try:
        svc = AuthService(db, r)
        user = svc.register(body.username, body.email, body.password, body.phone)
        svc.send_otp(user)
        db.commit()
        return MFASetupResponse(user_id=user.id, requires_mfa=True,
                                message="Registered successfully. Check your email for OTP.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=MFASetupResponse)
def login(body: LoginRequest, db: Session = Depends(get_db), r=Depends(get_redis)):
    svc = AuthService(db, r)
    user = svc.authenticate(body.username, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    svc.send_otp(user)
    return MFASetupResponse(user_id=user.id, requires_mfa=True,
                            message="OTP sent to your registered email.")


@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp(body: MFAVerifyRequest, db: Session = Depends(get_db), r=Depends(get_redis)):
    try:
        svc = AuthService(db, r)
        svc.verify_otp(body.user_id, body.otp)
        user = svc.get_user_by_id(body.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        access, refresh = svc.create_tokens(user)
        return TokenResponse(access_token=access, refresh_token=refresh)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db), r=Depends(get_redis)):
    try:
        svc = AuthService(db, r)
        access, refresh = svc.refresh_tokens(body.refresh_token)
        return TokenResponse(access_token=access, refresh_token=refresh)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/me", response_model=UserResponse)
def me(user=Depends(get_current_user)):
    return user


@router.get("/google")
def google_login():
    """Redirect to Google OAuth consent screen."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")
    params = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
        f"&response_type=code&scope=openid email profile"
    )
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=params)


@router.get("/google/callback", response_model=TokenResponse)
async def google_callback(code: str, db: Session = Depends(get_db), r=Depends(get_redis)):
    """Handle Google OAuth callback and issue tokens."""
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            token_res = await client.post("https://oauth2.googleapis.com/token", data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            })
            token_data = token_res.json()
            userinfo_res = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
            )
            userinfo = userinfo_res.json()

        svc = AuthService(db, r)
        user = svc.get_or_create_google_user(
            google_id=userinfo["sub"],
            email=userinfo["email"],
            name=userinfo.get("name", userinfo["email"]),
            avatar=userinfo.get("picture"),
        )
        db.commit()
        access, refresh = svc.create_tokens(user)
        return TokenResponse(access_token=access, refresh_token=refresh)
    except Exception as e:
        logger.error("Google OAuth error", error=str(e))
        raise HTTPException(status_code=400, detail="Google authentication failed")
