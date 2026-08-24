import uuid
from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from app.tenancy.mixins import TenantModelMixin

class StockAllocation(TenantModelMixin, Base):
    __tablename__ = 'stock_allocations'
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    medicine_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('medicines.id', ondelete='CASCADE'), nullable=False, index=True)
    inventory_batch_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('inventory_batches.id', ondelete='CASCADE'), nullable=False, index=True)
    # Nullable because allocations pre-date billing and may originate elsewhere.
    invoice_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('invoices.id', ondelete='RESTRICT'), nullable=True, index=True)
    
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    medicine = relationship("Medicine", foreign_keys=[medicine_id])
    inventory_batch = relationship("InventoryBatch", foreign_keys=[inventory_batch_id])
    invoice = relationship("Invoice", foreign_keys=[invoice_id])
