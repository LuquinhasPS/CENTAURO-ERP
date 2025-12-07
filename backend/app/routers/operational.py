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

@router.post("/allocations", response_model=List[schemas.AllocationResponse])
async def create_allocation(allocation: schemas.AllocationCreate, db: AsyncSession = Depends(get_db)):
    from datetime import timedelta
    from app.models.project_resources import ProjectCollaborator, ProjectVehicle
    
    created_allocations = []
    
    # 1. Iterate dates
    current_date = allocation.start_date
    while current_date <= allocation.end_date:
        # Check if allocation exists for this resource/date?
        # For checks we would need a query. Let's assume we can create (or overlapping allowed).
        # Better: Delete existing for this resource/date if exists?
        # Scheduler usually replaces.
        # Let's delete existing allocation for this resource on this date to avoid duplicates/conflicts
        await db.execute(
            select(models.Allocation).filter(
                models.Allocation.date == current_date,
                models.Allocation.resource_id == allocation.resource_id,
                models.Allocation.resource_type == allocation.resource_type
            ).execution_options(synchronize_session=False)
        )
        # Note: delete via execute is tricky with async.
        # Easier: Query and delete.
        existing = await db.execute(select(models.Allocation).where(
            models.Allocation.date == current_date,
            models.Allocation.resource_id == allocation.resource_id,
            models.Allocation.resource_type == allocation.resource_type
        ))
        for row in existing.scalars().all():
            await db.delete(row)
            
        new_alloc = models.Allocation(
            date=current_date,
            resource_type=allocation.resource_type,
            resource_id=allocation.resource_id,
            description=allocation.description,
            type=allocation.type,
            project_id=allocation.project_id,
            contract_id=allocation.contract_id
            # status? Model doesn't seem to have status in lines 34-51 of operational.py view!
            # Schema added status="CONFIRMED". I need to check if Model has status.
            # Step 827 view shows NO status column in Allocation model.
            # Only `type` (Reservation/Justification).
            # So I skip status.
        )
        db.add(new_alloc)
        created_allocations.append(new_alloc)
        current_date += timedelta(days=1)
        
    # 2. Link to Project
    if allocation.project_id:
        if allocation.resource_type == "PERSON":
            # Check if exists
            q = select(ProjectCollaborator).where(
                ProjectCollaborator.project_id == allocation.project_id,
                ProjectCollaborator.collaborator_id == allocation.resource_id
            )
            res = await db.execute(q)
            pc = res.scalars().first()
            
            if not pc:
                # Create default entry covering this period
                pc = ProjectCollaborator(
                    project_id=allocation.project_id,
                    collaborator_id=allocation.resource_id,
                    role="Alocado via Scheduler",
                    start_date=allocation.start_date,
                    end_date=allocation.end_date,
                    status="active"
                )
                db.add(pc)
            else:
                # Ideally extend dates if outside range?
                # For now, safe to leave as is if already on project.
                pass
                
        elif allocation.resource_type == "CAR":
             # Check if exists
            q = select(ProjectVehicle).where(
                ProjectVehicle.project_id == allocation.project_id,
                ProjectVehicle.vehicle_id == allocation.resource_id
            )
            res = await db.execute(q)
            pv = res.scalars().first()
            
            if not pv:
                pv = ProjectVehicle(
                    project_id=allocation.project_id,
                    vehicle_id=allocation.resource_id,
                    start_date=allocation.start_date,
                    end_date=allocation.end_date
                )
                db.add(pv)

    await db.commit()
    return created_allocations

@router.put("/allocations/{allocation_id}", response_model=List[schemas.AllocationResponse])
async def update_allocation(allocation_id: int, allocation: schemas.AllocationCreate, db: AsyncSession = Depends(get_db)):
    from datetime import timedelta
    from app.models.project_resources import ProjectCollaborator, ProjectVehicle

    # 1. Delete the existing allocation
    result = await db.execute(select(models.Allocation).where(models.Allocation.id == allocation_id))
    db_allocation = result.scalar_one_or_none()
    if db_allocation:
        await db.delete(db_allocation)
        # Check permissions? Assuming open for now.
    else:
        # If not found, maybe just proceed to create? Or 404? 
        # Standard HTTP PUT on ID should 404 if ID missing.
        raise HTTPException(status_code=404, detail="Allocation not found")

    created_allocations = []
    
    # 2. Iterate dates (Same logic as create)
    current_date = allocation.start_date
    while current_date <= allocation.end_date:
        # Delete overlaps to avoid duplicates (clean slate approach for the range)
        existing = await db.execute(select(models.Allocation).where(
            models.Allocation.date == current_date,
            models.Allocation.resource_id == allocation.resource_id,
            models.Allocation.resource_type == allocation.resource_type
        ))
        for row in existing.scalars().all():
            await db.delete(row)
            
        new_alloc = models.Allocation(
            date=current_date,
            resource_type=allocation.resource_type,
            resource_id=allocation.resource_id,
            description=allocation.description,
            type=allocation.type,
            project_id=allocation.project_id,
            contract_id=allocation.contract_id
        )
        db.add(new_alloc)
        created_allocations.append(new_alloc)
        current_date += timedelta(days=1)

    # 3. Link to Project (Same logic)
    if allocation.project_id:
        if allocation.resource_type == "PERSON":
            res = await db.execute(
                select(ProjectCollaborator).where(
                    ProjectCollaborator.project_id == allocation.project_id,
                    ProjectCollaborator.collaborator_id == allocation.resource_id
                )
            )
            pc = res.scalars().first()
            if not pc:
                pc = ProjectCollaborator(
                    project_id=allocation.project_id,
                    collaborator_id=allocation.resource_id,
                    role="Alocado via Scheduler",
                    start_date=allocation.start_date,
                    end_date=allocation.end_date,
                    status="active"
                )
                db.add(pc)
                
        elif allocation.resource_type == "CAR":
            res = await db.execute(
                select(ProjectVehicle).where(
                    ProjectVehicle.project_id == allocation.project_id,
                    ProjectVehicle.vehicle_id == allocation.resource_id
                )
            )
            pv = res.scalars().first()
            if not pv:
                pv = ProjectVehicle(
                    project_id=allocation.project_id,
                    vehicle_id=allocation.resource_id,
                    start_date=allocation.start_date,
                    end_date=allocation.end_date
                )
                db.add(pv)
    
    await db.commit()
    return created_allocations

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
    result = await db.execute(select(models.Collaborator).options(selectinload(models.Collaborator.certifications)).where(models.Collaborator.id == collaborator_id))
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
