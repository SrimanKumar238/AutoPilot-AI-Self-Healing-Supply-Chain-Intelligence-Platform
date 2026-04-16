"""Supplier model – vendor management with risk scoring."""
from sqlalchemy import Column, String, Float, DateTime, Enum as SAEnum, Integer, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime, timezone
import uuid
import enum


class SupplierRiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    code = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(256), nullable=False)
    country = Column(String(128), nullable=True)
    region = Column(String(128), nullable=True)
    category = Column(String(128), nullable=True)
    description = Column(Text, nullable=True)

    # Contact (PII-like, stored as-is for business use, not personal data)
    contact_name = Column(String(256), nullable=True)
    contact_email = Column(String(256), nullable=True)
    contact_phone = Column(String(64), nullable=True)
    website = Column(String(512), nullable=True)

    # Performance metrics
    reliability_score = Column(Float, default=85.0)  # 0-100
    quality_score = Column(Float, default=85.0)
    on_time_delivery_rate = Column(Float, default=90.0)  # percentage
    avg_lead_time_days = Column(Integer, default=14)
    total_orders = Column(Integer, default=0)
    defect_rate = Column(Float, default=1.0)  # percentage

    # Risk
    risk_level = Column(SAEnum(SupplierRiskLevel), default=SupplierRiskLevel.low)
    risk_score = Column(Float, default=20.0)  # 0-100, higher = riskier
    is_active = Column(Boolean, default=True)
    is_certified = Column(Boolean, default=False)

    contract_start = Column(DateTime(timezone=True), nullable=True)
    contract_end = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    shipments = relationship("Shipment", back_populates="supplier")
    inventory_items = relationship("Inventory", back_populates="supplier")
    alerts = relationship("Alert", back_populates="supplier")
