import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
import sys

# Add parent directory to path to import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import Base
from app.models.users import PasswordResetToken

async def migrate():
    DEPLOY_URL = "postgresql+asyncpg://postgres:HdRksQOjchuaJZAytjNIsrZnuWWnWcAZ@centerbeam.proxy.rlwy.net:24604/railway"
    print(f"Connecting to {DEPLOY_URL}...")
    engine = create_async_engine(DEPLOY_URL)
    
    async with engine.begin() as conn:
        print("Creating 'password_reset_tokens' table...")
        # We use run_sync to create tables defined in Base
        def create_tables(connection):
            Base.metadata.create_all(connection, tables=[PasswordResetToken.__table__])
        
        await conn.run_sync(create_tables)
        print("Table created successfully.")
                
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate())
