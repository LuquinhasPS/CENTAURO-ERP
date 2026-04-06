from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from app.database import get_db
from app.auth import authenticate_user, create_access_token, get_current_active_user, ACCESS_TOKEN_EXPIRE_MINUTES, get_password_hash
from app.schemas.auth import Token, UserResponse, LoginRequest, ForgotPasswordRequest, ResetPasswordRequest
from app.models.users import User, PasswordResetToken
from app.services.email_service import email_service
import uuid
from datetime import datetime, timedelta
from sqlalchemy import text

router = APIRouter()

@router.post("/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
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
    # Fetch user with collaborator relationship and role
    query = select(User).options(
        selectinload(User.collaborator).selectinload(User.collaborator.property.mapper.class_.role_obj)
    ).where(User.id == current_user.id)
    result = await db.execute(query)
    user_with_collab = result.scalar_one_or_none()
    
    # Build response with collaborator_name
    collaborator_name = None
    if user_with_collab and user_with_collab.collaborator:
        collaborator_name = user_with_collab.collaborator.name
    
    
    # Use user_with_collab to access the properties that rely on relationships (like permissions)
    # If fetch failed for some reason (unlikely if active), fall back to current_user
    final_user = user_with_collab if user_with_collab else current_user

    print(f"DEBUG: User {final_user.email} Role: {final_user.role}")
    print(f"DEBUG: Permissions: {final_user.permissions}")

    return UserResponse(
        id=final_user.id,
        email=final_user.email,
        role=final_user.role,
        is_superuser=final_user.is_superuser,
        permissions=final_user.permissions or {},
        collaborator_id=final_user.collaborator_id,
        collaborator_name=collaborator_name
    )

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    # 1. Verify user exists
    query = select(User).where(User.email == request.email)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    # We return success even if user not found for security (avoid enumeration)
    # but only send email if user exists
    if user:
        # 2. Create token
        token = str(uuid.uuid4())
        # Set expiration (1 hour)
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        # 3. Save token (or replace if one already exists for this email)
        # Clear old tokens for this email first
        await db.execute(text("DELETE FROM password_reset_tokens WHERE email = :e"), {"e": request.email})
        
        db_token = PasswordResetToken(email=request.email, token=token, expires_at=expires_at)
        db.add(db_token)
        await db.commit()
        
        # 4. Send email
        await email_service.send_password_reset_email(request.email, token)
        
    return {"message": "Se o email estiver cadastrado, um link de recuperação será enviado."}

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    # 1. Find token
    query = select(PasswordResetToken).where(PasswordResetToken.token == request.token)
    result = await db.execute(query)
    db_token = result.scalar_one_or_none()
    
    if not db_token:
        raise HTTPException(status_code=400, detail="Token inválido ou expirado.")
    
    # 2. Check expiration
    if db_token.expires_at < datetime.utcnow():
        await db.delete(db_token)
        await db.commit()
        raise HTTPException(status_code=400, detail="O link de recuperação expirou.")
    
    # 3. Update password
    query = select(User).where(User.email == db_token.email)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if user:
        user.password_hash = get_password_hash(request.new_password)
        # 4. Delete token
        await db.delete(db_token)
        await db.commit()
        return {"message": "Senha atualizada com sucesso!"}
    
    raise HTTPException(status_code=404, detail="Usuário não encontrado.")
