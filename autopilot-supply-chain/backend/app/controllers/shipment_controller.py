"""Shipment controller – CRUD + event publishing."""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import structlog

from app.core.database import get_db
from app.models.shipment import Shipment, ShipmentStatus
from app.schemas.supply_schemas import ShipmentCreate, ShipmentUpdate, ShipmentResponse, PaginatedResponse
from app.middlewares.auth_middleware import require_viewer, require_operator
from app.services.event_publisher import publish_event_sync

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/shipments", tags=["Shipments"])


def _gen_tracking():
    return "AP-" + str(uuid.uuid4())[:8].upper()


@router.get("", response_model=dict)
def list_shipments(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[ShipmentStatus] = None,
    db: Session = Depends(get_db),
    _=Depends(require_viewer),
):
    q = db.query(Shipment)
    if status:
        q = q.filter(Shipment.status == status)
    total = q.count()
    items = q.order_by(Shipment.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {
        "items": [ShipmentResponse.model_validate(s) for s in items],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("", response_model=ShipmentResponse, status_code=201)
def create_shipment(body: ShipmentCreate, db: Session = Depends(get_db), _=Depends(require_operator)):
    shipment = Shipment(
        tracking_number=body.tracking_number or _gen_tracking(),
        origin=body.origin,
        destination=body.destination,
        carrier=body.carrier,
        priority=body.priority,
        weight_kg=body.weight_kg,
        value_usd=body.value_usd,
        expected_delivery=body.expected_delivery,
        supplier_id=body.supplier_id,
        notes=body.notes,
    )
    db.add(shipment)
    db.commit()
    db.refresh(shipment)
    publish_event_sync("shipment_created", {"shipment_id": str(shipment.id),
                                             "tracking": shipment.tracking_number})
    logger.info("Shipment created", tracking=shipment.tracking_number)
    return shipment


@router.get("/{shipment_id}", response_model=ShipmentResponse)
def get_shipment(shipment_id: str, db: Session = Depends(get_db), _=Depends(require_viewer)):
    s = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return s


@router.patch("/{shipment_id}", response_model=ShipmentResponse)
def update_shipment(shipment_id: str, body: ShipmentUpdate, db: Session = Depends(get_db), _=Depends(require_operator)):
    s = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Shipment not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(s, field, value)
    db.commit()
    db.refresh(s)
    event = "shipment_delayed" if body.status == ShipmentStatus.delayed else "shipment_updated"
    publish_event_sync(event, {"shipment_id": str(s.id), "status": s.status.value,
                               "delay_hours": s.delay_hours})
    return s


@router.delete("/{shipment_id}", status_code=204)
def delete_shipment(shipment_id: str, db: Session = Depends(get_db), _=Depends(require_operator)):
    s = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Shipment not found")
    db.delete(s)
    db.commit()
