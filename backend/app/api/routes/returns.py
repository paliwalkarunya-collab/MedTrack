from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.return_schema import ReturnCreate, ReturnResponse, ReturnCompleteResponse
from app.services.return_service import ReturnService
from app.tenancy.dependencies import require_tenant_from_header


router = APIRouter(tags=["Returns"])


def get_return_service(db: Session = Depends(get_db), _=Depends(require_tenant_from_header)) -> ReturnService:
    return ReturnService(db)


@router.post("/", response_model=ReturnResponse, status_code=status.HTTP_201_CREATED)
def create_return(return_in: ReturnCreate, service: ReturnService = Depends(get_return_service)):
    """Create a DRAFT return."""
    return service.create_return(return_in)


@router.get("/", response_model=list[ReturnResponse])
def list_returns(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    return_number: str | None = None,
    invoice_id: UUID | None = None,
    return_status: str | None = Query(None, alias="status"),
    date_from: date | None = None,
    date_to: date | None = None,
    service: ReturnService = Depends(get_return_service),
):
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=422, detail="date_from must not be after date_to")
    return service.list_returns(skip, limit, return_number, invoice_id, return_status, date_from, date_to)


@router.get("/{return_id}", response_model=ReturnResponse)
def get_return(return_id: UUID, service: ReturnService = Depends(get_return_service)):
    return_obj = service.get_return(return_id)
    if not return_obj:
        raise HTTPException(status_code=404, detail="Return not found")
    return return_obj


@router.post("/{return_id}/complete", response_model=ReturnCompleteResponse)
def complete_return(return_id: UUID, service: ReturnService = Depends(get_return_service)):
    """Complete a DRAFT return: validate, restore stock to original batches, calculate refund."""
    return service.complete_return(return_id)


@router.patch("/{return_id}", response_model=ReturnResponse)
def cancel_return(return_id: UUID, service: ReturnService = Depends(get_return_service)):
    """Cancel a DRAFT return (cannot cancel COMPLETED returns)."""
    return service.cancel_return(return_id)


@router.delete("/{return_id}", response_model=ReturnResponse)
def delete_return(return_id: UUID, service: ReturnService = Depends(get_return_service)):
    """Delete a DRAFT return (alias for cancel)."""
    return service.delete_return(return_id)