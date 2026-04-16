"""Alert controller – AI-detected anomalies and self-healing log."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone
import structlog

from app.core.database import get_db
from app.models.alert import Alert, AlertStatus, AlertSeverity
from app.schemas.supply_schemas import AlertResponse
from app.middlewares.auth_middleware import require_viewer, require_operator

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=dict)
def list_alerts(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[AlertStatus] = None,
    severity: Optional[AlertSeverity] = None,
    db: Session = Depends(get_db),
    _=Depends(require_viewer),
):
    q = db.query(Alert)
    if status:
        q = q.filter(Alert.status == status)
    if severity:
        q = q.filter(Alert.severity == severity)
    total = q.count()
    items = q.order_by(Alert.detected_at.desc()).offset((page - 1) * size).limit(size).all()
    return {"items": [AlertResponse.model_validate(a) for a in items],
            "total": total, "page": page, "size": size, "pages": (total + size - 1) // size}


@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(alert_id: str, db: Session = Depends(get_db), _=Depends(require_viewer)):
    a = db.query(Alert).filter(Alert.id == alert_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    return a


@router.patch("/{alert_id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert(alert_id: str, db: Session = Depends(get_db), user=Depends(require_operator)):
    a = db.query(Alert).filter(Alert.id == alert_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    a.status = AlertStatus.acknowledged
    a.assigned_user_id = user.id
    db.commit()
    db.refresh(a)
    return a


@router.patch("/{alert_id}/resolve", response_model=AlertResponse)
def resolve_alert(alert_id: str, db: Session = Depends(get_db), _=Depends(require_operator)):
    a = db.query(Alert).filter(Alert.id == alert_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    a.status = AlertStatus.resolved
    a.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(a)
    return a
