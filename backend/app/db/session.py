from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session, with_loader_criteria
from app.core.config import settings
from app.models.base import Base
from app.tenancy.mixins import TenantModelMixin
from app.tenancy.tenant_context import get_current_pharmacy_id, is_system_bypass, TenantContextRequired

# For this initial foundation, we do not require a live DB at startup,
# so we configure pool_pre_ping to help handle dropped connections gracefully.
# The engine is created, but connection isn't forced until a query is executed.
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@event.listens_for(Session, "do_orm_execute")
def _tenant_filter(execute_state):
    """
    Automatically intercepts all ORM statements (SELECT, UPDATE, DELETE)
    and applies tenant isolation if the model inherits from TenantModelMixin.
    """
    if is_system_bypass() or not execute_state.is_orm_statement:
        return

    # Check if any tenant model is involved in this specific execution
    # This correctly catches SELECTs, lazy relationship loads, UPDATEs, and DELETEs
    has_tenant_model = any(
        issubclass(mapper.class_, TenantModelMixin)
        for mapper in execute_state.all_mappers
    )

    if not has_tenant_model:
        return

    # If a tenant model is involved, we MUST have a tenant context
    current_tenant_id = get_current_pharmacy_id()
    if not current_tenant_id:
        raise TenantContextRequired("Tenant context is required to access tenant-owned models.")

    # Inject the filter dynamically. The tenant ID is resolved OUTSIDE the lambda
    # to comply with SQLAlchemy's statement compilation and variable tracking.
    execute_state.statement = execute_state.statement.options(
        with_loader_criteria(
            TenantModelMixin,
            lambda cls: cls.pharmacy_id == current_tenant_id,
            include_aliases=True
        )
    )

def get_db():

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
