from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.customer import CustomerCreate, CustomerResponse
from app.schemas.invoice import InvoiceCreate, InvoiceResponse, InvoiceUpdate
from app.services.invoice_service import InvoiceService
from app.tenancy.dependencies import require_tenant_from_header


router = APIRouter()


def get_invoice_service(db: Session = Depends(get_db), _=Depends(require_tenant_from_header)) -> InvoiceService:
    return InvoiceService(db)


@router.post("/customers", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(customer_in: CustomerCreate, service: InvoiceService = Depends(get_invoice_service)):
    return service.create_customer(customer_in)


@router.post("/", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(invoice_in: InvoiceCreate, service: InvoiceService = Depends(get_invoice_service)):
    return service.create_invoice(invoice_in)


@router.get("/", response_model=list[InvoiceResponse])
def list_invoices(
    skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=100),
    invoice_number: str | None = None, date_from: date | None = None, date_to: date | None = None,
    customer_id: UUID | None = None, invoice_status: str | None = Query(None, alias="status"),
    service: InvoiceService = Depends(get_invoice_service),
):
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=422, detail="date_from must not be after date_to")
    return service.list_invoices(skip, limit, invoice_number, date_from, date_to, customer_id, invoice_status)


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(invoice_id: UUID, service: InvoiceService = Depends(get_invoice_service)):
    invoice = service.get_invoice(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.patch("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(invoice_id: UUID, invoice_in: InvoiceUpdate, service: InvoiceService = Depends(get_invoice_service)):
    return service.update_invoice(invoice_id, invoice_in)


@router.post("/{invoice_id}/complete", response_model=InvoiceResponse)
def complete_invoice(invoice_id: UUID, service: InvoiceService = Depends(get_invoice_service)):
    return service.complete_invoice(invoice_id)


@router.delete("/{invoice_id}", response_model=InvoiceResponse)
def cancel_invoice(invoice_id: UUID, service: InvoiceService = Depends(get_invoice_service)):
    return service.cancel_invoice(invoice_id)
