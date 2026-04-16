"""Shipment model – tracks packages from origin to destination."""
from sqlalchemy import Column, String, Float, DateTime, Enum as SAEnum, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime, timezone
import uuid
import enum


class ShipmentStatus(str, enum.Enum):
    pending = "pending"
    in_transit = "in_transit"
    at_customs = "at_customs"
    delayed = "delayed"
    delivered = "delivered"
    cancelled = "cancelled"


class ShipmentPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tracking_number = Column(String(64), unique=True, nullable=False, index=True)

    origin = Column(String(256), nullable=False)
    destination = Column(String(256), nullable=False)
    origin_lat = Column(Float, nullable=True)
    origin_lng = Column(Float, nullable=True)
    dest_lat = Column(Float, nullable=True)
    dest_lng = Column(Float, nullable=True)
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)
    current_location = Column(String(256), nullable=True)

    status = Column(SAEnum(ShipmentStatus), default=ShipmentStatus.pending)
    priority = Column(SAEnum(ShipmentPriority), default=ShipmentPriority.medium)

    carrier = Column(String(128), nullable=True)
    weight_kg = Column(Float, nullable=True)
    value_usd = Column(Float, nullable=True)

    expected_delivery = Column(DateTime(timezone=True), nullable=True)
    actual_delivery = Column(DateTime(timezone=True), nullable=True)
    delay_hours = Column(Float, default=0.0)

    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=True)
    notes = Column(Text, nullable=True)
    metadata_ = Column("metadata", JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    supplier = relationship("Supplier", back_populates="shipments")
    alerts = relationship("Alert", back_populates="shipment")
