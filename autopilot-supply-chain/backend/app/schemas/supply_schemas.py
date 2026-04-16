"""Supply chain schemas – safe API input/output models."""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models.shipment import ShipmentStatus, ShipmentPriority
from app.models.inventory import InventoryStatus
from app.models.supplier import SupplierRiskLevel
from app.models.alert import AlertType, AlertSeverity, AlertStatus


# ── Shipment ───────────────────────────────────────────────────────────────────
class ShipmentCreate(BaseModel):
    tracking_number: Optional[str] = None
    origin: str
    destination: str
    carrier: Optional[str] = None
    priority: ShipmentPriority = ShipmentPriority.medium
    weight_kg: Optional[float] = None
    value_usd: Optional[float] = None
    expected_delivery: Optional[datetime] = None
    supplier_id: Optional[UUID] = None
    notes: Optional[str] = None


class ShipmentUpdate(BaseModel):
    status: Optional[ShipmentStatus] = None
    current_location: Optional[str] = None
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    delay_hours: Optional[float] = None
    notes: Optional[str] = None


class ShipmentResponse(BaseModel):
    id: UUID
    tracking_number: str
    origin: str
    destination: str
    current_location: Optional[str] = None
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    status: ShipmentStatus
    priority: ShipmentPriority
    carrier: Optional[str] = None
    weight_kg: Optional[float] = None
    value_usd: Optional[float] = None
    expected_delivery: Optional[datetime] = None
    actual_delivery: Optional[datetime] = None
    delay_hours: float
    supplier_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Inventory ──────────────────────────────────────────────────────────────────
class InventoryCreate(BaseModel):
    sku: str
    product_name: str
    category: Optional[str] = None
    warehouse_location: Optional[str] = None
    quantity_on_hand: int = 0
    reorder_point: int = 100
    reorder_quantity: int = 500
    max_stock: int = 2000
    unit_cost: Optional[float] = None
    unit_price: Optional[float] = None
    supplier_id: Optional[UUID] = None
    lead_time_days: int = 7


class InventoryUpdate(BaseModel):
    quantity_on_hand: Optional[int] = None
    quantity_reserved: Optional[int] = None
    quantity_in_transit: Optional[int] = None
    reorder_point: Optional[int] = None
    status: Optional[InventoryStatus] = None


class InventoryResponse(BaseModel):
    id: UUID
    sku: str
    product_name: str
    category: Optional[str] = None
    warehouse_location: Optional[str] = None
    quantity_on_hand: int
    quantity_reserved: int
    quantity_in_transit: int
    available_quantity: int
    reorder_point: int
    max_stock: int
    status: InventoryStatus
    unit_cost: Optional[float] = None
    lead_time_days: int
    supplier_id: Optional[UUID] = None
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Supplier ───────────────────────────────────────────────────────────────────
class SupplierCreate(BaseModel):
    code: str
    name: str
    country: Optional[str] = None
    region: Optional[str] = None
    category: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    avg_lead_time_days: int = 14


class SupplierResponse(BaseModel):
    id: UUID
    code: str
    name: str
    country: Optional[str] = None
    region: Optional[str] = None
    category: Optional[str] = None
    reliability_score: float
    quality_score: float
    on_time_delivery_rate: float
    avg_lead_time_days: int
    risk_level: SupplierRiskLevel
    risk_score: float
    is_active: bool
    is_certified: bool
    total_orders: int

    class Config:
        from_attributes = True


# ── Alert ──────────────────────────────────────────────────────────────────────
class AlertResponse(BaseModel):
    id: UUID
    alert_type: AlertType
    severity: AlertSeverity
    status: AlertStatus
    title: str
    description: str
    ai_confidence: float
    shipment_id: Optional[UUID] = None
    inventory_id: Optional[UUID] = None
    supplier_id: Optional[UUID] = None
    healing_action: Optional[str] = None
    auto_healed: bool
    detected_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Dashboard ──────────────────────────────────────────────────────────────────
class DashboardKPI(BaseModel):
    total_shipments: int
    on_time_rate: float
    delayed_shipments: int
    critical_alerts: int
    inventory_health: float
    avg_supplier_reliability: float
    active_anomalies: int
    healed_today: int


class PaginatedResponse(BaseModel):
    items: List
    total: int
    page: int
    size: int
    pages: int
