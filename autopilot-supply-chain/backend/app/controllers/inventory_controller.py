"""Inventory controller – stock management with reorder triggers."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import structlog

from app.core.database import get_db
from app.models.inventory import Inventory, InventoryStatus
from app.schemas.supply_schemas import InventoryCreate, InventoryUpdate, InventoryResponse
from app.middlewares.auth_middleware import require_viewer, require_operator
from app.services.event_publisher import publish_event_sync

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/inventory", tags=["Inventory"])


def _compute_status(inv: Inventory) -> InventoryStatus:
    avail = inv.quantity_on_hand - inv.quantity_reserved
    if avail <= 0:
        return InventoryStatus.out_of_stock
    elif avail <= inv.reorder_point * 0.5:
        return InventoryStatus.critical
    elif avail <= inv.reorder_point:
        return InventoryStatus.low
    elif inv.quantity_on_hand >= inv.max_stock * 0.9:
        return InventoryStatus.overstock
    return InventoryStatus.healthy


@router.get("", response_model=dict)
def list_inventory(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[InventoryStatus] = None,
    db: Session = Depends(get_db),
    _=Depends(require_viewer),
):
    q = db.query(Inventory)
    if status:
        q = q.filter(Inventory.status == status)
    total = q.count()
    items = q.offset((page - 1) * size).limit(size).all()
    return {
        "items": [InventoryResponse.model_validate(i) for i in items],
        "total": total, "page": page, "size": size,
        "pages": (total + size - 1) // size,
    }


@router.post("", response_model=InventoryResponse, status_code=201)
def create_inventory(body: InventoryCreate, db: Session = Depends(get_db), _=Depends(require_operator)):
    inv = Inventory(**body.model_dump())
    inv.status = _compute_status(inv)
    db.add(inv)
    db.commit()
    db.refresh(inv)
    logger.info("Inventory item created", sku=inv.sku)
    return inv


@router.get("/{inventory_id}", response_model=InventoryResponse)
def get_inventory(inventory_id: str, db: Session = Depends(get_db), _=Depends(require_viewer)):
    inv = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return inv


@router.patch("/{inventory_id}", response_model=InventoryResponse)
def update_inventory(inventory_id: str, body: InventoryUpdate, db: Session = Depends(get_db), _=Depends(require_operator)):
    inv = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(inv, field, value)
    inv.status = _compute_status(inv)
    db.commit()
    db.refresh(inv)

    if inv.status in (InventoryStatus.low, InventoryStatus.critical, InventoryStatus.out_of_stock):
        publish_event_sync("inventory_low", {"inventory_id": str(inv.id), "sku": inv.sku,
                                             "status": inv.status.value, "quantity": inv.quantity_on_hand})
    else:
        publish_event_sync("inventory_updated", {"inventory_id": str(inv.id), "sku": inv.sku})
    return inv
