from typing import Optional
from fastapi import Header, HTTPException
from uuid import UUID
from app.tenancy.tenant_context import set_current_pharmacy_id

async def get_tenant_from_header(x_pharmacy_id: Optional[UUID] = Header(None, alias="X-Pharmacy-ID")):
    """
    Dependency to resolve the current pharmacy tenant from a request header.
    
    WARNING: This is ONLY for development/testing purposes.
    Do NOT use this in production as an authorization mechanism.
    A client can easily spoof this header.
    
    Future tickets will implement proper authentication/RBAC and derive
    the pharmacy ID from the authenticated user's PharmacyMembership.
    """
    if x_pharmacy_id:
        # Set it in the context variable
        set_current_pharmacy_id(x_pharmacy_id)
    return x_pharmacy_id

async def require_tenant_from_header(x_pharmacy_id: Optional[UUID] = Header(None, alias="X-Pharmacy-ID")):
    """
    Same as get_tenant_from_header but raises a 400 if missing.
    Again, purely for dev/test until auth is built.
    """
    if not x_pharmacy_id:
        raise HTTPException(status_code=400, detail="X-Pharmacy-ID header is required")
    
    set_current_pharmacy_id(x_pharmacy_id)
    return x_pharmacy_id
