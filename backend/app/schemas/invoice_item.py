from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class InvoiceItemCreate(BaseModel):
    medicine_id: UUID
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0, max_digits=10, decimal_places=2)
    discount_amount: Decimal = Field(default=Decimal("0"), ge=0, max_digits=10, decimal_places=2)
    tax_amount: Decimal = Field(default=Decimal("0"), ge=0, max_digits=10, decimal_places=2)


class InvoiceItemResponse(InvoiceItemCreate):
    id: UUID
    invoice_id: UUID
    pharmacy_id: UUID
    line_total: Decimal

    model_config = ConfigDict(from_attributes=True)
