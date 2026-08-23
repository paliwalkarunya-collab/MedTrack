from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_pharmacy, require_staff
from app.db.session import get_db
from app.schemas.expiry import ExpiryListResponse, ExpirySummaryResponse
from app.services.expiry_service import ExpiryService

router = APIRouter(tags=["Expiry"], dependencies=[Depends(require_staff), Depends(get_current_pharmacy)])


@router.get("/", response_model=ExpiryListResponse)
def list_expiry_batches(
    medicine_id: Optional[UUID] = None, search: Optional[str] = None,
    status: Optional[str] = Query(None, pattern="^(EXPIRED|CRITICAL|EXPIRING_SOON|SAFE)$"),
    from_date: Optional[date] = None, to_date: Optional[date] = None,
    skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    items, total = ExpiryService.list_batches(db, medicine_id, search, status, from_date, to_date, skip, limit)
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/summary", response_model=ExpirySummaryResponse)
def expiry_summary(db: Session = Depends(get_db)):
    return ExpiryService.summary(db)


@router.get("/expired", response_model=ExpiryListResponse)
def expired_batches(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=500), db: Session = Depends(get_db)):
    items, total = ExpiryService.list_batches(db, status="EXPIRED", skip=skip, limit=limit)
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/expiring-soon", response_model=ExpiryListResponse)
def expiring_soon_batches(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=500), db: Session = Depends(get_db)):
    # Operationally, critical stock is also expiring soon and is therefore included.
    items, total = ExpiryService.list_batches(db, skip=0, limit=10_000)
    filtered = [item for item in items if item["expiry_status"] in {"CRITICAL", "EXPIRING_SOON"}]
    return {"items": filtered[skip:skip + limit], "total": len(filtered), "skip": skip, "limit": limit}
