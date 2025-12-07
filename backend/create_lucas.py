import asyncio
import sys
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.users import User, UserRole
from app.models.operational import Collaborator
from app.auth import get_password_hash

async def create_user_lucas():
    async with AsyncSessionLocal() as db:
        # 1. Provide Lucas Silva Collaborator
        result = await db.execute(select(Collaborator).where(Collaborator.name == "Lucas Silva"))
        collaborator = result.scalars().first()
        
        if not collaborator:
            print("❌ Collaborator 'Lucas Silva' not found!")
            return

        print(f"✅ Found Collaborator: {collaborator.name} (ID: {collaborator.id})")
        print(f"   Email: {collaborator.email}")
        print(f"   Role ID: {collaborator.role_id}")

        # 2. Check/Create User
        # We use the collaborator's email for the login
        email = collaborator.email
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()

        if user:
            print(f"ℹ️ User {email} already exists. Updating link...")
            user.collaborator_id = collaborator.id
        else:
            print(f"Creating new user for {email}...")
            user = User(
                email=email,
                password_hash=get_password_hash("senha123"),
                role=UserRole.VISUALIZADOR, # Role comes from Collaborator
                collaborator_id=collaborator.id,
                is_superuser=False
            )
            db.add(user)
        
        await db.commit()
        print(f"✅ User {email} created/updated successfully!")
        print(f"   Login: {email}")
        print(f"   Password: senha123")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(create_user_lucas())
