from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from app.database import get_db
from app.models import operational as models
from app.schemas import operational as schemas

router = APIRouter()

# Allocations
@router.get("/allocations", response_model=List[schemas.AllocationResponse])
async def get_allocations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Allocation))
    allocations = result.scalars().all()
    return allocations

@router.post("/allocations", response_model=schemas.AllocationResponse)
async def create_allocation(allocation: schemas.AllocationCreate, db: AsyncSession = Depends(get_db)):
    db_allocation = models.Allocation(**allocation.model_dump())
    db.add(db_allocation)
    await db.commit()
    await db.refresh(db_allocation)
    return db_allocation

@router.put("/allocations/{allocation_id}", response_model=schemas.AllocationResponse)
async def update_allocation(allocation_id: int, allocation: schemas.AllocationCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Allocation).where(models.Allocation.id == allocation_id))
    db_allocation = result.scalar_one_or_none()
    if not db_allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")
    
    for key, value in allocation.model_dump().items():
        setattr(db_allocation, key, value)
    
    await db.commit()
    await db.refresh(db_allocation)
    return db_allocation

@router.delete("/allocations/{allocation_id}")
async def delete_allocation(allocation_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Allocation).where(models.Allocation.id == allocation_id))
    db_allocation = result.scalar_one_or_none()
    if not db_allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")
    
    await db.delete(db_allocation)
    await db.commit()
    return {"message": "Allocation deleted"}

# Collaborators
@router.get("/collaborators", response_model=List[schemas.CollaboratorResponse])
async def get_collaborators(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Collaborator).options(selectinload(models.Collaborator.certifications)))
    collaborators = result.scalars().all()
    return collaborators

@router.post("/collaborators", response_model=schemas.CollaboratorResponse)
async def create_collaborator(collaborator: schemas.CollaboratorCreate, db: AsyncSession = Depends(get_db)):
    db_collaborator = models.Collaborator(**collaborator.model_dump())
    db.add(db_collaborator)
    await db.commit()
    await db.refresh(db_collaborator)
    return db_collaborator

@router.put("/collaborators/{collaborator_id}", response_model=schemas.CollaboratorResponse)
async def update_collaborator(collaborator_id: int, collaborator: schemas.CollaboratorCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Collaborator).where(models.Collaborator.id == collaborator_id))
    db_collaborator = result.scalar_one_or_none()
    if not db_collaborator:
        raise HTTPException(status_code=404, detail="Collaborator not found")
    
    for key, value in collaborator.model_dump().items():
        setattr(db_collaborator, key, value)
    
    await db.commit()
    await db.refresh(db_collaborator)
    return db_collaborator

@router.delete("/collaborators/{collaborator_id}")
async def delete_collaborator(collaborator_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Collaborator).where(models.Collaborator.id == collaborator_id))
    db_collaborator = result.scalar_one_or_none()
    if not db_collaborator:
        raise HTTPException(status_code=404, detail="Collaborator not found")
    
    await db.delete(db_collaborator)
    await db.commit()
    return {"message": "Collaborator deleted"}

# Certifications
@router.get("/certifications/{collaborator_id}", response_model=List[schemas.CertificationResponse])
async def get_certifications(collaborator_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Certification).where(models.Certification.collaborator_id == collaborator_id))
    certifications = result.scalars().all()
    return certifications

@router.post("/certifications", response_model=schemas.CertificationResponse)
async def create_certification(certification: schemas.CertificationCreate, db: AsyncSession = Depends(get_db)):
    db_certification = models.Certification(**certification.model_dump())
    db.add(db_certification)
    await db.commit()
    await db.refresh(db_certification)
    return db_certification

@router.delete("/certifications/{certification_id}")
async def delete_certification(certification_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Certification).where(models.Certification.id == certification_id))
    db_certification = result.scalar_one_or_none()
    if not db_certification:
        raise HTTPException(status_code=404, detail="Certification not found")
    
    await db.delete(db_certification)
    await db.commit()
    return {"message": "Certification deleted"}
