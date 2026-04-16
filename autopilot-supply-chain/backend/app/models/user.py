"""
User model – PII fields (email, phone) stored encrypted via Fernet.
PII is NEVER exposed in API responses (controlled by Pydantic schemas).
"""
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.security import encrypt_pii, decrypt_pii
from datetime import datetime, timezone
import uuid
import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    operator = "operator"
    viewer = "viewer"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)

    # PII – stored encrypted, never returned via API
    _email_encrypted = Column("email_encrypted", String(512), nullable=False)
    _phone_encrypted = Column("phone_encrypted", String(512), nullable=True)

    hashed_password = Column(String(256), nullable=True)  # Null for OAuth users
    role = Column(SAEnum(UserRole), default=UserRole.viewer, nullable=False)

    is_active = Column(Boolean, default=True)
    is_mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(256), nullable=True)  # TOTP secret (encrypted)

    # OAuth
    google_id = Column(String(256), nullable=True, unique=True)
    avatar_url = Column(String(512), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    alerts = relationship("Alert", back_populates="assigned_user", lazy="select")

    # ── PII property accessors ──────────────────────────────────
    @property
    def email(self) -> str:
        return decrypt_pii(self._email_encrypted)

    @email.setter
    def email(self, value: str):
        self._email_encrypted = encrypt_pii(value)

    @property
    def phone(self) -> str:
        return decrypt_pii(self._phone_encrypted) if self._phone_encrypted else ""

    @phone.setter
    def phone(self, value: str):
        self._phone_encrypted = encrypt_pii(value) if value else None

    def __repr__(self):
        return f"<User id={self.id} username={self.username} role={self.role}>"
