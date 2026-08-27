import datetime
import uuid
from sqlalchemy import Column, Date, DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.models.base import Base
from app.tenancy.mixins import TenantModelMixin


class Return(TenantModelMixin, Base):
    __tablename__ = "returns"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    return_number: Mapped[str] = mapped_column(String(100), nullable=False)
    invoice_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("invoices.id", ondelete="RESTRICT"), nullable=False, index=True)
    customer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("customers.id", ondelete="RESTRICT"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="DRAFT")
    refund_amount: Mapped[object] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    reason: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    invoice = relationship("Invoice", foreign_keys=[invoice_id])
    customer = relationship("Customer", foreign_keys=[customer_id])
    items = relationship("ReturnItem", back_populates="return_", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("pharmacy_id", "return_number", name="uq_return_pharmacy_number"),)