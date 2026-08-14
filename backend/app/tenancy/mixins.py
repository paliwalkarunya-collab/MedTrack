from sqlalchemy import Column, ForeignKey
from sqlalchemy.types import Uuid
from sqlalchemy.orm import declared_attr
import uuid

class TenantModelMixin:
    """
    Mixin to automatically add pharmacy_id to tenant-owned models.
    
    NOTE: This mixin provides the column and foreign key relationship,
    but it does NOT automatically hide or magically rewrite queries.
    Future repository/service layers must explicitly apply tenant filtering
    using get_current_pharmacy_id() to ensure data isolation.
    """
    
    @declared_attr
    def pharmacy_id(cls):
        # We use Uuid for compatibility with both PostgreSQL and SQLite
        return Column(Uuid, ForeignKey('pharmacies.id', ondelete='CASCADE'), nullable=False, index=True)
