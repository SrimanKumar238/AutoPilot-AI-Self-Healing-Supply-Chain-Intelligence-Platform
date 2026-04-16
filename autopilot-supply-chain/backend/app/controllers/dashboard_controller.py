"""Dashboard controller – aggregated KPIs and admin user management."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, timedelta
import structlog

from app.core.database import get_db
from app.models.shipment import Shipment, ShipmentStatus
from app.models.inventory import Inventory, InventoryStatus
from app.models.supplier import Supplier
from app.models.alert import Alert, AlertStatus, AlertSeverity
from app.models.user import User, UserRole
from app.schemas.supply_schemas import DashboardKPI
from app.schemas.auth_schemas import UserResponse, UserAdminResponse, UpdateRoleRequest
from app.middlewares.auth_middleware import require_viewer, require_admin
from fastapi import HTTPException

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/kpis", response_model=DashboardKPI)
def get_kpis(db: Session = Depends(get_db), _=Depends(require_viewer)):
    today = datetime.now(timezone.utc).date()

    total_shipments = db.query(Shipment).count()
    delayed = db.query(Shipment).filter(Shipment.status == ShipmentStatus.delayed).count()
    on_time_rate = round((1 - (delayed / max(total_shipments, 1))) * 100, 1)

    critical_alerts = db.query(Alert).filter(
        Alert.status == AlertStatus.open,
        Alert.severity == AlertSeverity.critical
    ).count()

    active_anomalies = db.query(Alert).filter(
        Alert.status.in_([AlertStatus.open, AlertStatus.healing])
    ).count()

    healed_today = db.query(Alert).filter(
        Alert.auto_healed == True,
        func.date(Alert.healed_at) == today,
    ).count()

    # Inventory health
    total_inv = db.query(Inventory).count()
    healthy_inv = db.query(Inventory).filter(Inventory.status == InventoryStatus.healthy).count()
    inventory_health = round((healthy_inv / max(total_inv, 1)) * 100, 1)

    avg_rel = db.query(func.avg(Supplier.reliability_score)).scalar() or 0.0

    return DashboardKPI(
        total_shipments=total_shipments,
        on_time_rate=on_time_rate,
        delayed_shipments=delayed,
        critical_alerts=critical_alerts,
        inventory_health=inventory_health,
        avg_supplier_reliability=round(float(avg_rel), 1),
        active_anomalies=active_anomalies,
        healed_today=healed_today,
    )


# ── Admin: User management ────────────────────────────────────────────────────
admin_router = APIRouter(prefix="/admin", tags=["Admin"])


@admin_router.get("/users", response_model=list)
def list_users(db: Session = Depends(get_db), _=Depends(require_admin)):
    users = db.query(User).all()
    result = []
    for u in users:
        email = u.email
        masked = email[:2] + "***@" + email.split("@")[-1] if "@" in email else "***"
        result.append(UserAdminResponse(
            id=u.id, username=u.username, role=u.role,
            is_active=u.is_active, is_mfa_enabled=u.is_mfa_enabled,
            email_masked=masked, created_at=u.created_at
        ))
    return result


@admin_router.patch("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(user_id: str, body: UpdateRoleRequest, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = body.role
    db.commit()
    db.refresh(user)
    return user


@admin_router.patch("/users/{user_id}/toggle-active", response_model=UserResponse)
def toggle_user_active(user_id: str, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return user
