import asyncio
import sys
import os
sys.path.append(os.getcwd())
from app.database import AsyncSessionLocal
from sqlalchemy import text

async def check_db():
    async with AsyncSessionLocal() as db:
        try:
            # Check tables
            result = await db.execute(text("SELECT name FROM sqlite_master WHERE type='table';"))
            tables = result.scalars().all()
            print(f"Tables: {tables}")
            
            # Check roles
            if 'roles' in tables:
                result = await db.execute(text("SELECT count(*) FROM roles"))
                count = result.scalar()
                print(f"Roles count: {count}")
                
                result = await db.execute(text("SELECT * FROM roles LIMIT 1"))
                role = result.fetchone()
                print(f"First role: {role}")
            else:
                print("Table 'roles' NOT FOUND")

            # Check collaborators
            if 'collaborators' in tables:
                result = await db.execute(text("SELECT count(*) FROM collaborators"))
                count = result.scalar()
                print(f"Collaborators count: {count}")
                
                result = await db.execute(text("SELECT * FROM collaborators LIMIT 1"))
                collab = result.fetchone()
                print(f"First collaborator: {collab}")
            else:
                print("Table 'collaborators' NOT FOUND")
                
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check_db())
