from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.customer import CustomerResponse
from app.schemas.invoice_item import InvoiceItemCreate, InvoiceItemResponse
from app.schemas.medicine import MedicineResponse


class InvoiceCreate(BaseModel):
    invoice_number: str | None = Field(None, min_length=1, max_length=100)
    customer_id: UUID | None = None
    invoice_date: date | None = None
    notes: str | None = None
    items: list[InvoiceItemCreate] = Field(..., min_length=1)


class InvoiceUpdate(BaseModel):
    customer_id: UUID | None = None
    invoice_date: date | None = None
    notes: str | None = None
    items: list[InvoiceItemCreate] | None = Field(None, min_length=1)


class InvoiceItemDetail(InvoiceItemResponse):
    medicine: MedicineResponse


class InvoiceResponse(BaseModel):
    id: UUID
    pharmacy_id: UUID
    invoice_number: str
    customer_id: UUID | None
    invoice_date: date
    status: str
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    notes: str | None
    created_at: datetime
    updated_at: datetime | None = None
    customer: CustomerResponse | None = None
    items: list[InvoiceItemDetail] = []

    model_config = ConfigDict(from_attributes=True)
