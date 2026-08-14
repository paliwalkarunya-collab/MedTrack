from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.types import Uuid
from sqlalchemy.sql import func
from app.models.base import Base
import uuid

class Pharmacy(Base):
    __tablename__ = 'pharmacies'

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    legal_name = Column(String, nullable=True)
    gstin = Column(String, nullable=True)
    drug_license = Column(String, nullable=True)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
