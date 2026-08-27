import uuid
from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.models.base import Base
from app.tenancy.mixins import TenantModelMixin


class ReturnItem(TenantModelMixin, Base):
    __tablename__ = "return_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    return_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("returns.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("invoice_items.id", ondelete="RESTRICT"), nullable=False, index=True)
    medicine_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("medicines.id", ondelete="RESTRICT"), nullable=False, index=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_refund_price: Mapped[object] = mapped_column(Numeric(10, 2), nullable=False)
    refund_discount_amount: Mapped[object] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    refund_tax_amount: Mapped[object] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    line_refund_amount: Mapped[object] = mapped_column(Numeric(12, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    return_ = relationship("Return", back_populates="items", foreign_keys=[return_id])
    invoice_item = relationship("InvoiceItem", foreign_keys=[invoice_item_id])
    medicine = relationship("Medicine", foreign_keys=[medicine_id])
    allocations = relationship("ReturnAllocation", back_populates="return_item", cascade="all, delete-orphan")

    __table_args__ = (CheckConstraint("quantity > 0", name="ck_return_item_quantity_positive"),)