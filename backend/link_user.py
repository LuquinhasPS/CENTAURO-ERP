ocaimport asyncio
from sqlalchemy import update
from app.database import engine, AsyncSessionLocal
from app.models.users import User

async def link_user_to_collab():
    async with AsyncSessionLocal() as session:
        # User ID 2 -> Collaborator ID 79
        query = update(User).where(User.id == 2).values(collaborator_id=79)
        await session.execute(query)
        await session.commit()
        print("User ID 2 linked to Collaborator ID 79 successfully.")

if __name__ == "__main__":
    asyncio.run(link_user_to_collab())
