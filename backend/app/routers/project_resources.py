from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List
from datetime import timedelta
from app.database import get_db
from app.models import project_resources as models
from app.models.operational import Allocation
from app.schemas import project_resources as schemas

router = APIRouter()

# Project Collaborators
@router.get("/projects/{project_id}/collaborators", response_model=List[schemas.ProjectCollaboratorResponse])
@router.get("/projects/{project_id}/collaborators", response_model=List[schemas.ProjectCollaboratorResponse])
async def get_project_collaborators(project_id: int, db: AsyncSession = Depends(get_db)):
    # 1. Fetch Project Collaborators
    # We fetch all of them, but we will deduplicate by collaborator_id in Python
    result = await db.execute(
        select(models.ProjectCollaborator).where(models.ProjectCollaborator.project_id == project_id)
    )
    all_collabs_rows = result.scalars().all()
    
    # Deduplicate: Keep the first occurrence of each collaborator_id
    # This is to avoid showing the same person multiple times if they were added multiple times
    collaborators_map = {}
    for c in all_collabs_rows:
        if c.collaborator_id not in collaborators_map:
            collaborators_map[c.collaborator_id] = c
    
    unique_collaborators = list(collaborators_map.values())

    # 2. Fetch ALL Allocations for this project (Person type) to compute clusters
    # We fetch everything and process in Python (efficient enough for project size)
    alloc_result = await db.execute(
        select(Allocation)
        .where(
            Allocation.project_id == project_id,
            Allocation.resource_type == "PERSON"
        )
        .order_by(Allocation.resource_id, Allocation.date)
    )
    all_allocations = alloc_result.scalars().all()

    # Group allocations by resource_id
    from collections import defaultdict
    resource_allocs = defaultdict(list)
    for alloc in all_allocations:
        resource_allocs[alloc.resource_id].append(alloc.date)

    # 3. Compute Stats & Clusters for each resource
    alloc_data_map = {}
    for resource_id, dates in resource_allocs.items():
        if not dates:
            continue
            
        # Ensure sorted (DB should have sorted, but safety first)
        dates.sort()
        
        # Clustering Algorithm
        periods = []
        if dates:
            start_p = dates[0]
            prev_p = dates[0]
            count_p = 1
            
            for d in dates[1:]:
                # If date is consecutive (allow 1 day gap? No, strict continuity)
                if (d - prev_p).days == 1:
                    prev_p = d
                    count_p += 1
                else:
                    # Gap detected, close period
                    periods.append({"start": start_p, "end": prev_p, "days": count_p})
                    start_p = d
                    prev_p = d
                    count_p = 1
            # Close last period
            periods.append({"start": start_p, "end": prev_p, "days": count_p})

        alloc_data_map[resource_id] = {
            "real_start": dates[0],
            "real_end": dates[-1],
            "days_count": len(dates),
            "periods": periods
        }

    # 4. Merge Data into Response
    response = []
    for col in unique_collaborators:
        stats = alloc_data_map.get(col.collaborator_id, {})
        
        # Clone/Annotate object
        col_obj = col
        setattr(col_obj, "real_start_date", stats.get("real_start"))
        setattr(col_obj, "real_end_date", stats.get("real_end"))
        setattr(col_obj, "days_count", stats.get("days_count", 0))
        setattr(col_obj, "periods", stats.get("periods", []))
        
        response.append(col_obj)
        
    return response

@router.post("/projects/{project_id}/collaborators", response_model=schemas.ProjectCollaboratorResponse)
async def add_project_collaborator(project_id: int, data: schemas.ProjectCollaboratorCreate, db: AsyncSession = Depends(get_db)):
    db_item = models.ProjectCollaborator(**data.model_dump(exclude={'include_weekends'}))
    db.add(db_item)
    
    # Sync with Allocation (Scheduler)
    if data.start_date and data.end_date:
        import holidays
        br_holidays = holidays.BR()
        current_date = data.start_date
        while current_date <= data.end_date:
            # Check for Weekend/Holiday
            is_weekend = current_date.weekday() >= 5 # 5=Sat, 6=Sun
            is_holiday = current_date in br_holidays
            
            if (is_weekend or is_holiday) and not data.include_weekends:
                current_date += timedelta(days=1)
                continue

            # Delete existing to overwrite
            existing = await db.execute(select(Allocation).where(
                Allocation.date == current_date,
                Allocation.resource_id == data.collaborator_id,
                Allocation.resource_type == "PERSON"
            ))
            for row in existing.scalars().all():
                await db.delete(row)
            
            new_alloc = Allocation(
                date=current_date,
                resource_type="PERSON",
                resource_id=data.collaborator_id,
                project_id=project_id,
                type="RESERVATION",
                description=f"Alocado no Projeto {project_id}"
            )
            db.add(new_alloc)
            current_date += timedelta(days=1)
            
    await db.commit()
    await db.refresh(db_item)
    return db_item

@router.delete("/collaborators/{id}")
async def remove_project_collaborator(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.ProjectCollaborator).where(models.ProjectCollaborator.id == id))
    db_item = result.scalar_one_or_none()
    if not db_item:
        raise HTTPException(status_code=404, detail="Not found")
        
    # Sync remove from Allocation
    if db_item.start_date and db_item.end_date:
         # Delete allocations linked to this project/resource in that range
         allocs = await db.execute(select(Allocation).where(
             Allocation.project_id == db_item.project_id,
             Allocation.resource_id == db_item.collaborator_id,
             Allocation.resource_type == "PERSON",
             Allocation.date >= db_item.start_date,
             Allocation.date <= db_item.end_date
         ))
         for row in allocs.scalars().all():
             await db.delete(row)

    await db.delete(db_item)
    await db.commit()
    return {"message": "Deleted"}

# Project Tools
@router.get("/projects/{project_id}/tools", response_model=List[schemas.ProjectToolResponse])
async def get_project_tools(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.ProjectTool).where(models.ProjectTool.project_id == project_id)
    )
    return result.scalars().all()

@router.post("/projects/{project_id}/tools", response_model=schemas.ProjectToolResponse)
async def add_project_tool(project_id: int, data: schemas.ProjectToolCreate, db: AsyncSession = Depends(get_db)):
    db_item = models.ProjectTool(**data.model_dump(exclude={'include_weekends'}))
    db.add(db_item)
    
    # Sync with Allocation
    if data.start_date and data.end_date:
        import holidays
        br_holidays = holidays.BR()
        current_date = data.start_date
        while current_date <= data.end_date:
            # Check for Weekend/Holiday
            is_weekend = current_date.weekday() >= 5
            is_holiday = current_date in br_holidays
            
            if (is_weekend or is_holiday) and not data.include_weekends:
                current_date += timedelta(days=1)
                continue

            # Delete existing
            existing = await db.execute(select(Allocation).where(
                Allocation.date == current_date,
                Allocation.resource_id == data.tool_id,
                Allocation.resource_type == "TOOL"
            ))
            for row in existing.scalars().all():
                await db.delete(row)
            
            new_alloc = Allocation(
                date=current_date,
                resource_type="TOOL",
                resource_id=data.tool_id,
                project_id=project_id,
                type="RESERVATION",
                description=f"Ferramenta no Projeto {project_id}"
            )
            db.add(new_alloc)
            current_date += timedelta(days=1)

    await db.commit()
    await db.refresh(db_item)
    return db_item

@router.delete("/tools/{id}")
async def remove_project_tool(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.ProjectTool).where(models.ProjectTool.id == id))
    db_item = result.scalar_one_or_none()
    if not db_item:
        raise HTTPException(status_code=404, detail="Not found")
    
    # Sync remove from Allocation
    if db_item.start_date and db_item.end_date:
         allocs = await db.execute(select(Allocation).where(
             Allocation.project_id == db_item.project_id,
             Allocation.resource_id == db_item.tool_id,
             Allocation.resource_type == "TOOL",
             Allocation.date >= db_item.start_date,
             Allocation.date <= db_item.end_date
         ))
         for row in allocs.scalars().all():
             await db.delete(row)

    await db.delete(db_item)
    await db.commit()
    return {"message": "Deleted"}

# Project Vehicles
@router.get("/projects/{project_id}/vehicles", response_model=List[schemas.ProjectVehicleResponse])
async def get_project_vehicles(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.ProjectVehicle).where(models.ProjectVehicle.project_id == project_id)
    )
    return result.scalars().all()

@router.post("/projects/{project_id}/vehicles", response_model=schemas.ProjectVehicleResponse)
async def add_project_vehicle(project_id: int, data: schemas.ProjectVehicleCreate, db: AsyncSession = Depends(get_db)):
    db_item = models.ProjectVehicle(**data.model_dump(exclude={'include_weekends'}))
    db.add(db_item)
    
    # Sync with Allocation
    if data.start_date and data.end_date:
        import holidays
        br_holidays = holidays.BR()
        current_date = data.start_date
        while current_date <= data.end_date:
            # Check for Weekend/Holiday
            is_weekend = current_date.weekday() >= 5
            is_holiday = current_date in br_holidays
            
            if (is_weekend or is_holiday) and not data.include_weekends:
                current_date += timedelta(days=1)
                continue

            # Delete existing
            existing = await db.execute(select(Allocation).where(
                Allocation.date == current_date,
                Allocation.resource_id == data.vehicle_id,
                Allocation.resource_type == "CAR"
            ))
            for row in existing.scalars().all():
                await db.delete(row)
            
            new_alloc = Allocation(
                date=current_date,
                resource_type="CAR",
                resource_id=data.vehicle_id,
                project_id=project_id,
                type="RESERVATION",
                description=f"Veículo no Projeto {project_id}"
            )
            db.add(new_alloc)
            current_date += timedelta(days=1)

    await db.commit()
    await db.refresh(db_item)
    return db_item

@router.delete("/vehicles/{id}")
async def remove_project_vehicle(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.ProjectVehicle).where(models.ProjectVehicle.id == id))
    db_item = result.scalar_one_or_none()
    if not db_item:
        raise HTTPException(status_code=404, detail="Not found")
    
    # Sync remove from Allocation
    if db_item.start_date and db_item.end_date:
         allocs = await db.execute(select(Allocation).where(
             Allocation.project_id == db_item.project_id,
             Allocation.resource_id == db_item.vehicle_id,
             Allocation.resource_type == "CAR",
             Allocation.date >= db_item.start_date,
             Allocation.date <= db_item.end_date
         ))
         for row in allocs.scalars().all():
             await db.delete(row)

    await db.delete(db_item)
    await db.commit()
    return {"message": "Deleted"}
