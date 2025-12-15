import asyncio
import sys
import os
sys.path.append(os.getcwd())
from app.database import AsyncSessionLocal
from app.models.users import User
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        print("🔍 Checking Users in DB...")
        stmt = select(User)
        result = await db.execute(stmt)
        users = result.scalars().all()
        
        if not users:
            print("❌ No users found in database!")
        else:
            print(f"✅ Found {len(users)} users:")
            for u in users:
                print(f"   - ID: {u.id} | Email: {u.email} | Role: {u.role}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
