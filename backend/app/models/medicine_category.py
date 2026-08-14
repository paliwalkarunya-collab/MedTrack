import uuid
from sqlalchemy import Column, String, Boolean, UniqueConstraint, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from app.tenancy.mixins import TenantModelMixin

class MedicineCategory(TenantModelMixin, Base):
    __tablename__ = 'medicine_categories'
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    __table_args__ = (
        UniqueConstraint('pharmacy_id', 'name', name='uq_pharmacy_category_name'),
    )
