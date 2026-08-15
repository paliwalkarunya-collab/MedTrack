from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.types import Uuid
from sqlalchemy.sql import func
from app.models.base import Base
import uuid

class PharmacyMembership(Base):
    __tablename__ = 'pharmacy_memberships'

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, nullable=False, index=True)
    pharmacy_id = Column(Uuid, ForeignKey('pharmacies.id', ondelete='CASCADE'), nullable=False, index=True)
    status = Column(String, default='active', nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    __table_args__ = (
        UniqueConstraint('user_id', 'pharmacy_id', name='uq_user_pharmacy_membership'),
    )
