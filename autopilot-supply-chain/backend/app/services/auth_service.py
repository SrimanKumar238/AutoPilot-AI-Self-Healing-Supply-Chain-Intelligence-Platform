"""
Auth service – registration, login, MFA, token management, Google OAuth.
Uses Redis for OTP storage with TTL.
In DEMO mode (APP_ENV=development), OTP is also stored in memory for easy access.
"""
import random
import string
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
import structlog

from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.config import settings
from app.models.user import User, UserRole
from app.services.mfa_service import MFAService

logger = structlog.get_logger(__name__)

# In-memory OTP store for demo mode (when Redis unavailable)
_demo_otp_store: dict = {}


class AuthService:
    def __init__(self, db: Session, redis_client=None):
        self.db = db
        self.redis = redis_client
        self.mfa_service = MFAService(redis_client)

    def register(self, username: str, email: str, password: str, phone: Optional[str] = None) -> User:
        if self.db.query(User).filter(User.username == username).first():
            raise ValueError("Username already exists")

        user = User(
            username=username,
            role=UserRole.viewer,
            is_active=True,
            hashed_password=hash_password(password),
        )
        user.email = email
        if phone:
            user.phone = phone

        self.db.add(user)
        self.db.flush()
        logger.info("User registered", user_id=str(user.id), username=username)
        return user

    def authenticate(self, username: str, password: str) -> Optional[User]:
        user = self.db.query(User).filter(User.username == username).first()
        if not user or not user.hashed_password:
            return None
        if not verify_password(password, user.hashed_password):
            logger.warning("Failed login attempt", username=username)
            return None
        if not user.is_active:
            raise ValueError("Account is deactivated")
        return user

    def send_otp(self, user: User) -> str:
        """Generate and email an OTP; stores in Redis with TTL (and memory for demo)."""
        otp = "".join(random.choices(string.digits, k=6))
        key = f"otp:{user.id}"

        # Store in Redis (primary)
        if self.redis:
            try:
                self.redis.setex(key, settings.OTP_EXPIRE_MINUTES * 60, otp)
            except Exception as e:
                logger.warning("Redis OTP store failed, using memory", error=str(e))

        # Always keep in-memory as fallback (demo mode)
        _demo_otp_store[str(user.id)] = otp

        logger.info("OTP generated", user_id=str(user.id))
        # Send email (fire-and-forget — falls back to demo mode if no SMTP)
        self.mfa_service.send_otp_email(user.email, otp, user.username)
        return otp

    def verify_otp(self, user_id: UUID, otp: str) -> bool:
        key = f"otp:{user_id}"
        uid = str(user_id)

        # Try Redis first
        if self.redis:
            try:
                stored = self.redis.get(key)
                if stored is not None:
                    if stored.decode() != otp:
                        raise ValueError("Invalid OTP")
                    self.redis.delete(key)
                    _demo_otp_store.pop(uid, None)
                    return True
            except ValueError:
                raise
            except Exception as e:
                logger.warning("Redis OTP verify failed, checking memory", error=str(e))

        # Fallback to in-memory store (demo mode)
        stored_demo = _demo_otp_store.get(uid)
        if stored_demo is None:
            raise ValueError("OTP expired or not found. Please request a new code.")
        if stored_demo != otp:
            raise ValueError("Invalid OTP")
        _demo_otp_store.pop(uid, None)
        return True

    def create_tokens(self, user: User) -> Tuple[str, str]:
        payload = {"sub": str(user.id), "role": user.role.value}
        access = create_access_token(payload)
        refresh = create_refresh_token(payload)
        # Store refresh token in Redis for revocation support
        if self.redis:
            try:
                self.redis.setex(
                    f"refresh:{user.id}:{refresh[-16:]}",
                    settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
                    "valid",
                )
            except Exception:
                pass
        return access, refresh

    def refresh_tokens(self, refresh_token: str) -> Tuple[str, str]:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise ValueError("Invalid refresh token")
        user_id = payload.get("sub")
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise ValueError("User not found or inactive")
        return self.create_tokens(user)

    def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_or_create_google_user(self, google_id: str, email: str, name: str, avatar: Optional[str]) -> User:
        user = self.db.query(User).filter(User.google_id == google_id).first()
        if user:
            return user
        # Create new user from Google profile
        username = name.replace(" ", "_").lower()[:50]
        counter = 0
        base = username
        while self.db.query(User).filter(User.username == username).first():
            counter += 1
            username = f"{base}_{counter}"

        user = User(username=username, google_id=google_id, avatar_url=avatar, role=UserRole.viewer)
        user.email = email
        self.db.add(user)
        self.db.flush()
        logger.info("Google user created", user_id=str(user.id))
        return user
