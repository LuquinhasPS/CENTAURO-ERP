
import asyncio
import sys
import os
from sqlalchemy import select, func

sys.path.append(os.getcwd())

from app.database import AsyncSessionLocal
from app.models import users # Base
from app.models import operational # Collaborator
from app.models import commercial # Project
from app.models import project_resources # ProjectCollaborator (Depends on Collab + Project)
from app.models.operational import Allocation
from app.models.project_resources import ProjectCollaborator
from app.models.commercial import Project

async def main():
    async with AsyncSessionLocal() as db:
        print("🔧 Running Allocation Fix Script...")
        
        # Find Allocations with Project ID
        stmt = select(Allocation).where(
            Allocation.project_id.isnot(None),
            Allocation.resource_type == "PERSON"
        )
        res = await db.execute(stmt)
        allocations = res.scalars().all()
        
        fixed_count = 0
        
        # Group by (Project, Resource)
        # We want to ensure a ProjectCollaborator exists for each unique pair
        pairs = {} # (proj_id, res_id) -> {min_date, max_date}
        
        for a in allocations:
            key = (a.project_id, a.resource_id)
            if key not in pairs:
                pairs[key] = {'min': a.date, 'max': a.date}
            else:
                if a.date < pairs[key]['min']:
                    pairs[key]['min'] = a.date
                if a.date > pairs[key]['max']:
                    pairs[key]['max'] = a.date
                    
        print(f"📊 Found {len(pairs)} unique Project-Collaborator pairs from {len(allocations)} allocations.")
        
        for (proj_id, collab_id), dates in pairs.items():
            # Check if ProjectCollaborator exists
            stmt = select(ProjectCollaborator).where(
                ProjectCollaborator.project_id == proj_id,
                ProjectCollaborator.collaborator_id == collab_id
            )
            res = await db.execute(stmt)
            pc = res.scalars().first()
            
            if not pc:
                print(f"⚠️ Missing ProjectCollaborator for Project {proj_id}, Collab {collab_id}. Creating...")
                new_pc = ProjectCollaborator(
                    project_id=proj_id,
                    collaborator_id=collab_id,
                    role="Alocado via Scheduler (Fix)",
                    start_date=dates['min'],
                    end_date=dates['max'],
                    status="active"
                )
                db.add(new_pc)
                fixed_count += 1
            else:
                # Optional: Expand range if needed
                updated = False
                if pc.start_date and dates['min'] < pc.start_date:
                    pc.start_date = dates['min']
                    updated = True
                if pc.end_date and dates['max'] > pc.end_date:
                    pc.end_date = dates['max']
                    updated = True
                    
                if updated:
                    print(f"ℹ️ Updating range for Project {proj_id}, Collab {collab_id}")
                    db.add(pc)
                    fixed_count += 1
                    
        await db.commit()
        print(f"✅ Fix complete. {fixed_count} records created or updated.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
