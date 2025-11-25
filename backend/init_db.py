
import asyncio
from app.database import engine, Base
# Import all models to ensure they are registered with Base
from app.models import commercial, assets, operational, tickets, kanban, project_resources, purchases, roles

async def init_models():
    async with engine.begin() as conn:
        # await conn.run_sync(Base.metadata.drop_all) # Optional: Reset DB
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully.")

if __name__ == "__main__":
    asyncio.run(init_models())
