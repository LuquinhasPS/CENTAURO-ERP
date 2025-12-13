from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from app.database import get_db
from app.auth import authenticate_user, create_access_token, get_current_active_user, ACCESS_TOKEN_EXPIRE_MINUTES
from app.schemas.auth import Token, UserResponse, LoginRequest
from app.models.users import User

router = APIRouter()

@router.post("/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    # Fetch user with collaborator relationship
    query = select(User).options(selectinload(User.collaborator)).where(User.id == current_user.id)
    result = await db.execute(query)
    user_with_collab = result.scalar_one_or_none()
    
    # Build response with collaborator_name
    collaborator_name = None
    if user_with_collab and user_with_collab.collaborator:
        collaborator_name = user_with_collab.collaborator.name
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        is_superuser=current_user.is_superuser,
        permissions=current_user.permissions or {},
        collaborator_id=current_user.collaborator_id,
        collaborator_name=collaborator_name
    )
