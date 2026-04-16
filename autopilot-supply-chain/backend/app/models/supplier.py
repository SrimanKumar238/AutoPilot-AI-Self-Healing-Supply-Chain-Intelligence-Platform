"""Supplier model – supply chain partner management."""
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Enum as SAEnum, Text
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
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(256), nullable=False)
    country = Column(String(100), nullable=True)
    region = Column(String(100), nullable=True)
    category = Column(String(100), nullable=True)

    # Performance metrics
    reliability_score = Column(Float, default=0.8)      # 0-1
    quality_score = Column(Float, default=0.8)          # 0-1
    on_time_delivery_rate = Column(Float, default=0.8)  # 0-1
    avg_lead_time_days = Column(Integer, default=14)
    total_orders = Column(Integer, default=0)

    # Risk
    risk_level = Column(SAEnum(SupplierRiskLevel), default=SupplierRiskLevel.medium)
    risk_score = Column(Float, default=0.2)  # 0-1

    # Contact
    contact_name = Column(String(256), nullable=True)
    contact_email = Column(String(256), nullable=True)
    website = Column(String(512), nullable=True)

    # Status
    is_active = Column(Boolean, default=True)
    is_certified = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    shipments = relationship("Shipment", back_populates="supplier", lazy="select")
    inventory_items = relationship("Inventory", back_populates="supplier", lazy="select")
    alerts = relationship("Alert", back_populates="supplier", lazy="select")
