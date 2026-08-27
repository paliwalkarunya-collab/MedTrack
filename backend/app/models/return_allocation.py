import uuid
from sqlalchemy import Column, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.models.base import Base
from app.tenancy.mixins import TenantModelMixin


class ReturnAllocation(TenantModelMixin, Base):
    __tablename__ = "return_allocations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    return_item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("return_items.id", ondelete="CASCADE"), nullable=False, index=True)
    stock_allocation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stock_allocations.id", ondelete="RESTRICT"), nullable=False, index=True)
    inventory_batch_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("inventory_batches.id", ondelete="RESTRICT"), nullable=False, index=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    return_item = relationship("ReturnItem", back_populates="allocations", foreign_keys=[return_item_id])
    stock_allocation = relationship("StockAllocation", foreign_keys=[stock_allocation_id])
    inventory_batch = relationship("InventoryBatch", foreign_keys=[inventory_batch_id])