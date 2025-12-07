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
async def get_project_collaborators(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.ProjectCollaborator).where(models.ProjectCollaborator.project_id == project_id)
    )
    return result.scalars().all()

@router.post("/projects/{project_id}/collaborators", response_model=schemas.ProjectCollaboratorResponse)
async def add_project_collaborator(project_id: int, data: schemas.ProjectCollaboratorCreate, db: AsyncSession = Depends(get_db)):
    db_item = models.ProjectCollaborator(**data.model_dump())
    db.add(db_item)
    
    # Sync with Allocation (Scheduler)
    if data.start_date and data.end_date:
        current_date = data.start_date
        while current_date <= data.end_date:
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
    db_item = models.ProjectTool(**data.model_dump())
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item

@router.delete("/tools/{id}")
async def remove_project_tool(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.ProjectTool).where(models.ProjectTool.id == id))
    db_item = result.scalar_one_or_none()
    if not db_item:
        raise HTTPException(status_code=404, detail="Not found")
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
    db_item = models.ProjectVehicle(**data.model_dump())
    db.add(db_item)
    
    # Sync with Allocation
    if data.start_date and data.end_date:
        current_date = data.start_date
        while current_date <= data.end_date:
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
