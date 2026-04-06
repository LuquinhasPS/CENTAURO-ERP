import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from passlib.context import CryptContext

# Configuração de Hashing do Sistema
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

async def update_admin_password(new_password):
    DEPLOY_URL = "postgresql+asyncpg://postgres:HdRksQOjchuaJZAytjNIsrZnuWWnWcAZ@centerbeam.proxy.rlwy.net:24604/railway"
    engine = create_async_engine(DEPLOY_URL)
    
    # Gera o hash seguro da nova senha
    hashed_pwd = pwd_context.hash(new_password)
    
    async with engine.begin() as conn:
        result = await conn.execute(
            text("UPDATE users SET password_hash = :p WHERE email = 'admin@centauro.com'"),
            {"p": hashed_pwd}
        )
        if result.rowcount > 0:
            print("Sucesso! Senha do admin@centauro.com atualizada.")
        else:
            print("Erro: Usuário admin@centauro.com não encontrado no banco.")

if __name__ == "__main__":
    # COLOQUE A SENHA DESEJADA AQUI
    asyncio.run(update_admin_password("Q1W2e#r$T5Y6u&i*"))
