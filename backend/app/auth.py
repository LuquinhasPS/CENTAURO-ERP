from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.users import User
from app.schemas.auth import TokenData
import os
import asyncio
from functools import partial
from dotenv import load_dotenv

load_dotenv()

# Change this in production!
SECRET_KEY = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)

def verify_password_sync(plain_password, hashed_password):
    """Synchronous password verification - CPU intensive with Argon2"""
    return pwd_context.verify(plain_password, hashed_password)

async def verify_password(plain_password, hashed_password):
    """Async password verification - runs in thread pool to avoid blocking event loop"""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None, 
        partial(verify_password_sync, plain_password, hashed_password)
    )

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

from sqlalchemy.future import select

async def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    # BYPASS AUTH FOR DEVELOPMENT
    # Force auto-login as admin if no token or hardcoded bypass
    
    from sqlalchemy.orm import selectinload
    from app.models.operational import Collaborator

    async def get_admin_user():
        # Fallback to specifically seeded admin
        query = select(User).options(
            selectinload(User.collaborator).selectinload(Collaborator.role_obj)
        ).filter(User.email == "lucas.silva@centauro.com.br")
        result = await db.execute(query)
        user = result.scalars().first()
        return user

    if not token:
        user = await get_admin_user()
        if user:
            return user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - Missing token and no admin fallback available",
            headers={"WWW-Authenticate": "Bearer"},
        )

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            # Invalid token - fallback to admin in dev
            user = await get_admin_user()
            if user:
                return user
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        # Token expired or invalid - fallback to admin in dev mode for convenience
        user = await get_admin_user()
        if user:
            return user
        raise credentials_exception
    
    query = select(User).options(
        selectinload(User.collaborator).selectinload(Collaborator.role_obj)
    ).filter(User.email == token_data.email)
    
    result = await db.execute(query)
    user = result.scalars().first()
    if user is None:
        # User from token not found - fallback to admin
        user = await get_admin_user()
        if user:
            return user
        raise credentials_exception
    return user

async def authenticate_user(db: AsyncSession, email: str, password: str):
    result = await db.execute(select(User).filter(User.email == email))
    user = result.scalars().first()
    if not user:
        return False
    if not await verify_password(password, user.password_hash):
        return False
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    # Here we could check if user is active, assuming all users are active for now
    return current_user

def check_permission(user: User, module: str, action: str = 'read') -> bool:
    """
    Checks if the user has permission to perform action on module.
    Logic mirrors frontend hasPermission.
    """
    if not user:
        return False
        
    # Superuser has all permissions
    if user.is_superuser:
        return True
        
    permissions = user.permissions
    if not permissions:
        return False
        
    # Check specific module permissions
    module_perms = permissions.get(module)
    if not module_perms:
        return False
        
    return action in module_perms
