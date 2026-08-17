from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=64)
    role: UserRole = UserRole.STAFF


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[UUID] = None
    email: Optional[str] = None
    role: Optional[UserRole] = None


class UserResponse(UserBase):
    id: UUID
    role: UserRole
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True


class PharmacySelectRequest(BaseModel):
    pharmacy_id: UUID


class PharmacySelectResponse(BaseModel):
    pharmacy_id: UUID
    pharmacy_name: str
    role: UserRole
    message: str