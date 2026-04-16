"""Alert model – AI-detected anomalies and self-healing audit log."""
from sqlalchemy import Column, String, Float, DateTime, Enum as SAEnum, Text, Boolean, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime, timezone
import uuid
import enum


class AlertType(str, enum.Enum):
    shipment_delay = "shipment_delay"
    inventory_low = "inventory_low"
    supplier_risk = "supplier_risk"
    demand_spike = "demand_spike"
    route_disruption = "route_disruption"
    quality_issue = "quality_issue"
    cost_anomaly = "cost_anomaly"


class AlertSeverity(str, enum.Enum):
    info = "info"
    warning = "warning"
    critical = "critical"
    emergency = "emergency"


class AlertStatus(str, enum.Enum):
    open = "open"
    acknowledged = "acknowledged"
    healing = "healing"       # Worker 2 is processing
    resolved = "resolved"
    ignored = "ignored"


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    idempotency_key = Column(String(256), unique=True, nullable=False, index=True)

    alert_type = Column(SAEnum(AlertType), nullable=False)
    severity = Column(SAEnum(AlertSeverity), default=AlertSeverity.warning)
    status = Column(SAEnum(AlertStatus), default=AlertStatus.open)

    title = Column(String(512), nullable=False)
    description = Column(Text, nullable=False)
    ai_confidence = Column(Float, default=0.0)  # 0-1

    # References
    shipment_id = Column(UUID(as_uuid=True), ForeignKey("shipments.id"), nullable=True)
    inventory_id = Column(UUID(as_uuid=True), ForeignKey("inventory.id"), nullable=True)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=True)
    assigned_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Healing
    healing_action = Column(Text, nullable=True)
    healing_result = Column(JSON, nullable=True)
    healed_at = Column(DateTime(timezone=True), nullable=True)
    auto_healed = Column(Boolean, default=False)

    detected_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    shipment = relationship("Shipment", back_populates="alerts")
    inventory_item = relationship("Inventory", back_populates="alerts")
    supplier = relationship("Supplier", back_populates="alerts")
    assigned_user = relationship("User", back_populates="alerts")
