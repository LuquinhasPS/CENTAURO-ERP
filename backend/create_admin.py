import asyncio
import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

from app.database import AsyncSessionLocal, engine, Base
from app.models.users import User, UserRole
from app.auth import get_password_hash
from sqlalchemy import select

async def create_admin():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with AsyncSessionLocal() as db:
        print("🔍 Checking if admin user exists...")
        admin_email = "admin@centauro.com"
        stmt = select(User).filter(User.email == admin_email)
        result = await db.execute(stmt)
        existing_admin = result.scalars().first()
        
        if not existing_admin:
            hashed_password = get_password_hash("senha123")
            admin = User(
                email=admin_email,
                password_hash=hashed_password,
                role=UserRole.ADMIN,
                is_superuser=True
            )
            db.add(admin)
            await db.commit()
            print(f"✅ Admin user created: {admin_email} / senha123")
        else:
            hashed_password = get_password_hash("senha123")
            existing_admin.password_hash = hashed_password
            existing_admin.role = UserRole.ADMIN
            existing_admin.is_superuser = True
            await db.commit()
            print(f"ℹ️ Admin user '{admin_email}' updated with password 'senha123'.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(create_admin())
