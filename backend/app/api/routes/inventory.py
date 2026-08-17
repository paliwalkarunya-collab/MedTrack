from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.tenancy.dependencies import require_tenant_from_header
from app.schemas.fifo import FIFOAllocationRequest, FIFOAllocationResponse
from app.services.fifo_service import FIFOService
from app.api.deps import get_current_pharmacy, require_staff

router = APIRouter(dependencies=[Depends(require_staff), Depends(get_current_pharmacy)])

@router.post("/allocate", response_model=FIFOAllocationResponse)
def allocate_stock(
    request: FIFOAllocationRequest,
    db: Session = Depends(get_db)
):
    """
    Allocate stock for a medicine using FIFO logic.
    """
    result = FIFOService.allocate_stock(
        db=db,
        medicine_id=request.medicine_id,
        quantity=request.quantity
    )
    db.commit()
    return result
