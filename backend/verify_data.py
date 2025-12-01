import asyncio
import sys
import os
sys.path.append(os.getcwd())
from app.database import AsyncSessionLocal
from app.models.operational import Collaborator
from sqlalchemy import select

async def check_data():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Collaborator).limit(1))
        collab = result.scalar_one_or_none()
        if collab:
            print(f"Collaborator: {collab.name}")
            print(f"CNH Number: {collab.cnh_number}")
            print(f"CNH Category: {collab.cnh_category}")
            print(f"CNH Validity: {collab.cnh_validity}")
        else:
            print("No collaborators found.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check_data())
