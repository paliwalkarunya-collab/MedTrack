import contextvars
from typing import Optional
from uuid import UUID

class TenantContextRequired(Exception):
    """Raised when a tenant-owned query is executed without an active tenant context."""
    pass

# Context variables
_current_pharmacy_id = contextvars.ContextVar[Optional[UUID]]("current_pharmacy_id", default=None)
_is_system_bypass = contextvars.ContextVar[bool]("is_system_bypass", default=False)

def set_current_pharmacy_id(pharmacy_id: UUID) -> contextvars.Token:
    """Set the current pharmacy ID for the tenant context."""
    return _current_pharmacy_id.set(pharmacy_id)

def get_current_pharmacy_id() -> Optional[UUID]:
    """Get the current pharmacy ID from the tenant context."""
    return _current_pharmacy_id.get()

def reset_current_pharmacy_id(token: contextvars.Token) -> None:
    """Reset the pharmacy ID context."""
    _current_pharmacy_id.reset(token)

def set_system_bypass(bypass: bool) -> contextvars.Token:
    """Bypass tenant context checks for system/admin operations."""
    return _is_system_bypass.set(bypass)

def is_system_bypass() -> bool:
    """Check if tenant filtering should be bypassed."""
    return _is_system_bypass.get()
