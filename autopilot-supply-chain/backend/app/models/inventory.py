"""Inventory model – warehouse stock level tracking."""
from sqlalchemy import Column, String, Integer, Float, DateTime, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime, timezone
import uuid
import enum


class InventoryStatus(str, enum.Enum):
    healthy = "healthy"
    low = "low"
    critical = "critical"
    overstock = "overstock"
    out_of_stock = "out_of_stock"


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    sku = Column(String(128), unique=True, nullable=False, index=True)
    product_name = Column(String(256), nullable=False)
    category = Column(String(128), nullable=True)
    description = Column(Text, nullable=True)

    warehouse_location = Column(String(256), nullable=True)
    quantity_on_hand = Column(Integer, default=0)
    quantity_reserved = Column(Integer, default=0)
    quantity_in_transit = Column(Integer, default=0)
    reorder_point = Column(Integer, default=100)
    reorder_quantity = Column(Integer, default=500)
    max_stock = Column(Integer, default=2000)

    unit_cost = Column(Float, nullable=True)
    unit_price = Column(Float, nullable=True)

    status = Column(SAEnum(InventoryStatus), default=InventoryStatus.healthy)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=True)
    lead_time_days = Column(Integer, default=7)

    last_reorder_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    supplier = relationship("Supplier", back_populates="inventory_items")
    alerts = relationship("Alert", back_populates="inventory_item")

    @property
    def available_quantity(self):
        return self.quantity_on_hand - self.quantity_reserved
