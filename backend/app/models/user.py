from sqlalchemy import Column, String, DateTime, Enum as SQLEnum
from sqlalchemy.types import Uuid
from sqlalchemy.sql import func
from app.models.base import Base
import uuid
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    PHARMACIST = "pharmacist"
    STAFF = "staff"


class User(Base):
    __tablename__ = 'users'

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(SQLEnum(UserRole), default=UserRole.STAFF, nullable=False)
    is_active = Column(String, default='true', nullable=False)  # Using String for SQLite compatibility
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)