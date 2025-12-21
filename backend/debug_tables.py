
import asyncio
import sys
import os
from sqlalchemy import select

sys.path.append(os.getcwd())

from app.database import AsyncSessionLocal

# Import ALL models to ensure SQLAlchemy registry is happy
from app.models import roles
from app.models import teams
from app.models import users
from app.models import commercial
from app.models import project_resources
from app.models import operational
from app.models import assets
from app.models import tickets
from app.models import purchases
from app.models import finance_payroll

async def main():
    async with AsyncSessionLocal() as db:
        print("🔍 Checking data for Lucas Silva...")
        
        # 1. Find Collaborator
        stmt = select(operational.Collaborator).where(operational.Collaborator.name == "Lucas Silva")
        res = await db.execute(stmt)
        lucas = res.scalars().first()
        
        if not lucas:
            print("❌ Lucas Silva NOT FOUND in collaborators table!")
            return
            
        print(f"✅ Found Lucas Silva (ID: {lucas.id}, Role: {lucas.role})")
        
        # 2. Check Project Collaborators
        print("\n--- Project Collaborators ---")
        stmt = select(project_resources.ProjectCollaborator).where(project_resources.ProjectCollaborator.collaborator_id == lucas.id)
        res = await db.execute(stmt)
        pcs = res.scalars().all()
        
        if not pcs:
            print("❌ No ProjectCollaborator records found.")
        else:
            for pc in pcs:
                print(f"✅ Found Project Link: Project ID {pc.project_id}, Dates: {pc.start_date} to {pc.end_date}, Status: {pc.status}")

        # 3. Check Allocations
        print("\n--- Allocations ---")
        stmt = select(operational.Allocation).where(
            operational.Allocation.resource_id == lucas.id, 
            operational.Allocation.resource_type == "PERSON"
        )
        res = await db.execute(stmt)
        allocs = res.scalars().all()
        
        if not allocs:
            print("❌ No Allocation records found.")
        else:
            print(f"✅ Found {len(allocs)} Allocation records.")
            for a in allocs:
                print(f"   - Date: {a.date}, Project: {a.project_id}, Desc: {a.description}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
