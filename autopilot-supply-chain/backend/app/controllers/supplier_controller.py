"""Supplier controller – vendor management."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import structlog

from app.core.database import get_db
from app.models.supplier import Supplier
from app.schemas.supply_schemas import SupplierCreate, SupplierResponse
from app.middlewares.auth_middleware import require_viewer, require_operator

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.get("", response_model=dict)
def list_suppliers(page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
                   db: Session = Depends(get_db), _=Depends(require_viewer)):
    total = db.query(Supplier).count()
    items = db.query(Supplier).offset((page - 1) * size).limit(size).all()
    return {"items": [SupplierResponse.model_validate(s) for s in items],
            "total": total, "page": page, "size": size, "pages": (total + size - 1) // size}


@router.post("", response_model=SupplierResponse, status_code=201)
def create_supplier(body: SupplierCreate, db: Session = Depends(get_db), _=Depends(require_operator)):
    sup = Supplier(**body.model_dump())
    db.add(sup)
    db.commit()
    db.refresh(sup)
    return sup


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(supplier_id: str, db: Session = Depends(get_db), _=Depends(require_viewer)):
    s = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return s


@router.patch("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(supplier_id: str, body: dict, db: Session = Depends(get_db), _=Depends(require_operator)):
    s = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Supplier not found")
    for k, v in body.items():
        if hasattr(s, k):
            setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s
