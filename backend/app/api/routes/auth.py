from datetime import timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.membership import PharmacyMembership
from app.models.pharmacy import Pharmacy
from app.schemas.auth import (
    UserCreate, UserLogin, Token, UserResponse,
    PharmacySelectRequest, PharmacySelectResponse
)
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.api.deps import (
    get_current_active_user, get_user_accessible_pharmacies,
    get_current_pharmacy_id_from_context
)
from app.tenancy.tenant_context import set_current_pharmacy_id

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = get_password_hash(user_in.password)
    user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        role=user_in.role,
        is_active='true'
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=True,
        created_at=user.created_at.isoformat() if user.created_at else ""
    )


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user.is_active != 'true':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value},
        expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=True,
        created_at=current_user.created_at.isoformat() if current_user.created_at else ""
    )


@router.get("/pharmacies", response_model=list[PharmacySelectResponse])
def list_accessible_pharmacies(
    pharmacies: list[Pharmacy] = Depends(get_user_accessible_pharmacies),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    memberships = db.query(PharmacyMembership).filter(
        PharmacyMembership.user_id == current_user.id,
        PharmacyMembership.status == 'active'
    ).all()
    
    membership_map = {m.pharmacy_id: m for m in memberships}
    
    return [
        PharmacySelectResponse(
            pharmacy_id=p.id,
            pharmacy_name=p.name,
            role=current_user.role,
            message=f"Accessible as {current_user.role.value}"
        )
        for p in pharmacies
    ]


@router.post("/select-pharmacy", response_model=PharmacySelectResponse)
def select_pharmacy(
    request: PharmacySelectRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    membership = db.query(PharmacyMembership).filter(
        PharmacyMembership.user_id == current_user.id,
        PharmacyMembership.pharmacy_id == request.pharmacy_id,
        PharmacyMembership.status == 'active'
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this pharmacy"
        )
    
    pharmacy = db.query(Pharmacy).filter(
        Pharmacy.id == request.pharmacy_id,
        Pharmacy.is_active == True
    ).first()
    
    if not pharmacy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pharmacy not found or inactive"
        )
    
    set_current_pharmacy_id(request.pharmacy_id)
    
    return PharmacySelectResponse(
        pharmacy_id=pharmacy.id,
        pharmacy_name=pharmacy.name,
        role=current_user.role,
        message=f"Selected pharmacy: {pharmacy.name}"
    )


@router.get("/current-pharmacy", response_model=PharmacySelectResponse)
def get_current_pharmacy(
    pharmacy_id: UUID = Depends(get_current_pharmacy_id_from_context),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    pharmacy = db.query(Pharmacy).filter(Pharmacy.id == pharmacy_id).first()
    if not pharmacy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pharmacy not found"
        )
    
    return PharmacySelectResponse(
        pharmacy_id=pharmacy.id,
        pharmacy_name=pharmacy.name,
        role=current_user.role,
        message=f"Current pharmacy: {pharmacy.name}"
    )