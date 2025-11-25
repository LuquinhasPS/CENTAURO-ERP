from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models import project_resources as models
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
    await db.commit()
    await db.refresh(db_item)
    return db_item

@router.delete("/collaborators/{id}")
async def remove_project_collaborator(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.ProjectCollaborator).where(models.ProjectCollaborator.id == id))
    db_item = result.scalar_one_or_none()
    if not db_item:
        raise HTTPException(status_code=404, detail="Not found")
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
    await db.commit()
    await db.refresh(db_item)
    return db_item

@router.delete("/vehicles/{id}")
async def remove_project_vehicle(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.ProjectVehicle).where(models.ProjectVehicle.id == id))
    db_item = result.scalar_one_or_none()
    if not db_item:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(db_item)
    await db.commit()
    return {"message": "Deleted"}
