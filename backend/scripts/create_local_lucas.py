import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from passlib.context import CryptContext
import os

# Configuração de Hashing do Sistema
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

async def force_create_local_user(email, password, collab_id=79):
    # LOCAL SQLITE DB
    # Based on .env: sqlite+aiosqlite:///./centauro.db
    # We are in backend/scripts, so ./centauro.db is in backend/
    LOCAL_URL = "sqlite+aiosqlite:///./centauro.db"
    
    # Let's ensure we are targeting the right path
    # If running from backend/ it's ./centauro.db
    # If running from root it's ./backend/centauro.db
    print(f"Connecting to local DB at {LOCAL_URL}...")
    engine = create_async_engine(LOCAL_URL)
    
    # Gera o hash seguro da nova senha
    hashed_pwd = pwd_context.hash(password)
    
    async with engine.begin() as conn:
        # Check exists
        res = await conn.execute(text("SELECT id FROM users WHERE email = :e"), {"e": email})
        exists = res.one_or_none()
        
        if exists:
            # Update password
            await conn.execute(
                text("UPDATE users SET password_hash = :p WHERE email = :e"),
                {"p": hashed_pwd, "e": email}
            )
            print(f"Sucesso! Usuário {email} já existia no LOCAL e teve a senha atualizada para '{password}'.")
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
                print(f"Sucesso! Novo usuário {email} criado no LOCAL com a senha '{password}' (Privilégio ADMIN).")
            except Exception as e:
                print(f"Erro ao inserir no SQLite Local: {e}")
                print("Tentando criar sem collaborator_id...")
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
                print(f"Sucesso! Novo usuário {email} criado no LOCAL (ADMIN).")

if __name__ == "__main__":
    asyncio.run(force_create_local_user("lucasdasilva@centaurotelecom.com.br", "senha123"))
