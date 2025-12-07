from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.users import UserRole

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[UserRole] = None

class UserBase(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.VISUALIZADOR
    collaborator_id: Optional[int] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_superuser: bool = False
    permissions: Optional[dict] = {}
    
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
