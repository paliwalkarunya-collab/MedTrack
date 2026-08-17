from typing import Optional
from uuid import UUID
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError

from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.membership import PharmacyMembership
from app.models.pharmacy import Pharmacy
from app.core.security import decode_access_token
from app.tenancy.tenant_context import set_current_pharmacy_id, get_current_pharmacy_id, reset_current_pharmacy_id

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id: Optional[str] = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == UUID(user_id)).first()
    if user is None:
        raise credentials_exception
    
    if user.is_active != 'true':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    return current_user


def require_role(*allowed_roles: UserRole):
    def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role: {[r.value for r in allowed_roles]}. Current role: {current_user.role.value}"
            )
        return current_user
    return role_checker


require_admin = require_role(UserRole.ADMIN)
require_pharmacist = require_role(UserRole.ADMIN, UserRole.PHARMACIST)
require_staff = require_role(UserRole.ADMIN, UserRole.PHARMACIST, UserRole.STAFF)


async def get_user_pharmacy_memberships(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> list[PharmacyMembership]:
    memberships = db.query(PharmacyMembership).filter(
        PharmacyMembership.user_id == current_user.id,
        PharmacyMembership.status == 'active'
    ).all()
    return memberships


async def get_user_accessible_pharmacies(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> list[Pharmacy]:
    memberships = db.query(PharmacyMembership).filter(
        PharmacyMembership.user_id == current_user.id,
        PharmacyMembership.status == 'active'
    ).all()
    
    pharmacy_ids = [m.pharmacy_id for m in memberships]
    if not pharmacy_ids:
        return []
    
    pharmacies = db.query(Pharmacy).filter(
        Pharmacy.id.in_(pharmacy_ids),
        Pharmacy.is_active == True
    ).all()
    return pharmacies


class PharmacySelectionContext:
    """
    Dependency that validates the user has membership to the requested pharmacy
    and sets the tenant context. Replaces the X-Pharmacy-ID header dependency.
    """
    
    def __init__(self, required: bool = True):
        self.required = required
    
    async def __call__(
        self,
        pharmacy_id: Optional[UUID] = Header(None, alias="X-Pharmacy-ID"),
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ) -> Optional[UUID]:
        if pharmacy_id is None:
            if self.required:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Pharmacy selection required. Use X-Pharmacy-ID header or call POST /auth/select-pharmacy first."
                )
            return None
        
        membership = db.query(PharmacyMembership).filter(
            PharmacyMembership.user_id == current_user.id,
            PharmacyMembership.pharmacy_id == pharmacy_id,
            PharmacyMembership.status == 'active'
        ).first()
        
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this pharmacy"
            )
        
        pharmacy = db.query(Pharmacy).filter(
            Pharmacy.id == pharmacy_id,
            Pharmacy.is_active == True
        ).first()
        
        if not pharmacy:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pharmacy not found or inactive"
            )
        
        set_current_pharmacy_id(pharmacy_id)
        return pharmacy_id


get_current_pharmacy = PharmacySelectionContext(required=True)
get_optional_pharmacy = PharmacySelectionContext(required=False)


async def get_current_pharmacy_id_from_context() -> UUID:
    """
    Get the current pharmacy ID from the context variable.
    This is used by services to ensure they're operating within the correct tenant.
    """
    pharmacy_id = get_current_pharmacy_id()
    if pharmacy_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pharmacy context set. Please select a pharmacy first."
        )
    return pharmacy_id