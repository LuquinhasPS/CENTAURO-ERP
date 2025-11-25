import asyncio
import sys
import os
from sqlalchemy import select, text

# Adiciona o diretório atual ao path para importar app
sys.path.append(os.getcwd())

from app.database import AsyncSessionLocal
from app.models.roles import Role
from app.models.operational import Collaborator

async def verify_data():
    async with AsyncSessionLocal() as db:
        print("🔍 Verificando banco de dados...")
        
        # Roles
        result = await db.execute(select(Role))
        roles = result.scalars().all()
        print(f"📋 Cargos encontrados: {len(roles)}")
        for r in roles:
            print(f"   - {r.name}")

        # Collaborators
        result = await db.execute(select(Collaborator))
        collaborators = result.scalars().all()
        print(f"👥 Colaboradores encontrados: {len(collaborators)}")
        for c in collaborators:
            print(f"   - {c.name} ({c.role})")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(verify_data())
