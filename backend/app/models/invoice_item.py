import uuid
from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.models.base import Base
from app.tenancy.mixins import TenantModelMixin


class InvoiceItem(TenantModelMixin, Base):
    __tablename__ = "invoice_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    invoice_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    medicine_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("medicines.id", ondelete="RESTRICT"), nullable=False, index=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[object] = mapped_column(Numeric(10, 2), nullable=False)
    discount_amount: Mapped[object] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    tax_amount: Mapped[object] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    line_total: Mapped[object] = mapped_column(Numeric(12, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    invoice = relationship("Invoice", back_populates="items", foreign_keys=[invoice_id])
    medicine = relationship("Medicine", foreign_keys=[medicine_id])

    __table_args__ = (CheckConstraint("quantity > 0", name="ck_invoice_item_quantity_positive"),)
