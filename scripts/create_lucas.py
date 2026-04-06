import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from passlib.context import CryptContext

# Configuração de Hashing do Sistema
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

async def force_create_user(email, password, collab_id=79):
    DEPLOY_URL = "postgresql+asyncpg://postgres:HdRksQOjchuaJZAytjNIsrZnuWWnWcAZ@centerbeam.proxy.rlwy.net:24604/railway"
    engine = create_async_engine(DEPLOY_URL)
    
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
            print(f"Sucesso! Usuário {email} já existia e teve a senha atualizada para '{password}'.")
        else:
            # Insert new
            await conn.execute(
                text("""
                    INSERT INTO users (email, password_hash, role, is_superuser, collaborator_id)
                    VALUES (:email, :pwd, 'VISUALIZADOR', false, :cid)
                """),
                {
                    "email": email,
                    "pwd": hashed_pwd,
                    "cid": collab_id
                }
            )
            print(f"Sucesso! Novo usuário {email} criado com a senha '{password}'.")

if __name__ == "__main__":
    asyncio.run(force_create_user("lucasdasilva@centaurotelecom.com.br", "784865Lps*"))
