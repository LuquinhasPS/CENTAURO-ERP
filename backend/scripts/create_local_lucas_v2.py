import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from passlib.context import CryptContext
import os
import sys

# Append app to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import Base
from app.models.users import User, PasswordResetToken

# Configuração de Hashing do Sistema
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

async def force_create_local_user(email, password, collab_id=79):
    # LOCAL SQLITE DB path from backend folder
    LOCAL_URL = "sqlite+aiosqlite:///./centauro.db"
    print(f"Connecting to local DB at {LOCAL_URL}...")
    engine = create_async_engine(LOCAL_URL)
    
    # Ensure tables exist
    async with engine.begin() as conn:
        print("Ensuring tables exist in local SQLite...")
        def create_all(connection):
            Base.metadata.create_all(connection)
        await conn.run_sync(create_all)
    
    # Gera o hash seguro da nova senha
    hashed_pwd = pwd_context.hash(password)
    
    async with engine.begin() as conn:
        # Check exists
        res = await conn.execute(text("SELECT id FROM users WHERE email = :e"), {"e": email})
        exists = res.one_or_none()
        
        if exists:
            # Update password and set as superuser for testing
            await conn.execute(
                text("UPDATE users SET password_hash = :p, is_superuser = true, role = 'ADMIN' WHERE email = :e"),
                {"p": hashed_pwd, "e": email}
            )
            print(f"Sucesso! {email} atualizado no LOCAL com '{password}' (Superuser).")
        else:
            # Insert new
            try:
                await conn.execute(
                    text("""
                        INSERT INTO users (email, password_hash, role, is_superuser, collaborator_id)
                        VALUES (:email, :pwd, 'ADMIN', true, :cid)
                    """),
                    {
                        "email": email,
                        "pwd": hashed_pwd,
                        "cid": collab_id
                    }
                )
                print(f"Sucesso! {email} criado no LOCAL com '{password}' (Superuser).")
            except Exception as e:
                # Fallback without collaborator id
                await conn.execute(
                    text("""
                        INSERT INTO users (email, password_hash, role, is_superuser)
                        VALUES (:email, :pwd, 'ADMIN', true)
                    """),
                    {
                        "email": email,
                        "pwd": hashed_pwd
                    }
                )
                print(f"Sucesso! {email} criado no LOCAL (ADMIN - no collab id).")

if __name__ == "__main__":
    # COLOQUE A SENHA MAIS RECENTE AQUI
    asyncio.run(force_create_local_user("lucasdasilva@centaurotelecom.com.br", "784865Lps*"))
