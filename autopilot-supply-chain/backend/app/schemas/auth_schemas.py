"""
Pydantic schemas – strictly enforces that PII (email, phone) is NEVER
exposed in any API response. Input schemas accept PII for write operations.
"""
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from uuid import UUID
from app.models.user import UserRole


# ── Auth Schemas ───────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    phone: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str


class MFAVerifyRequest(BaseModel):
    user_id: UUID
    otp: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class GoogleCallbackRequest(BaseModel):
    code: str
    state: Optional[str] = None


# ── User Schemas (no PII exposure) ────────────────────────────────────────────
class UserResponse(BaseModel):
    id: UUID
    username: str
    role: UserRole
    is_active: bool
    is_mfa_enabled: bool
    avatar_url: Optional[str] = None
    created_at: datetime
    # NOTE: email and phone are intentionally OMITTED

    class Config:
        from_attributes = True


class UserAdminResponse(BaseModel):
    """Admin-only view – includes masked email."""
    id: UUID
    username: str
    role: UserRole
    is_active: bool
    is_mfa_enabled: bool
    email_masked: Optional[str] = None  # e.g. j***@gmail.com
    created_at: datetime

    class Config:
        from_attributes = True


class UpdateRoleRequest(BaseModel):
    role: UserRole


class MFASetupResponse(BaseModel):
    user_id: UUID
    requires_mfa: bool
    message: str
