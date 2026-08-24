import datetime
import uuid
from sqlalchemy import Column, Date, DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.models.base import Base
from app.tenancy.mixins import TenantModelMixin


class Invoice(TenantModelMixin, Base):
    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    invoice_number: Mapped[str] = mapped_column(String(100), nullable=False)
    customer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("customers.id", ondelete="RESTRICT"), nullable=True, index=True)
    invoice_date: Mapped[datetime.date] = mapped_column(Date, nullable=False, default=datetime.date.today)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="DRAFT")
    subtotal: Mapped[object] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    discount_amount: Mapped[object] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    tax_amount: Mapped[object] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_amount: Mapped[object] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    customer = relationship("Customer", foreign_keys=[customer_id])
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("pharmacy_id", "invoice_number", name="uq_invoice_pharmacy_number"),)
