from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models import commercial as models
from app.schemas import commercial as schemas

router = APIRouter()

# Clients
@router.get("/clients", response_model=List[schemas.ClientResponse])
async def get_clients(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Client))
    clients = result.scalars().all()
    return clients

@router.post("/clients", response_model=schemas.ClientResponse)
async def create_client(client: schemas.ClientCreate, db: AsyncSession = Depends(get_db)):
    db_client = models.Client(**client.model_dump())
    db.add(db_client)
    await db.commit()
    await db.refresh(db_client)
    return db_client

@router.put("/clients/{client_id}", response_model=schemas.ClientResponse)
async def update_client(client_id: int, client: schemas.ClientCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Client).where(models.Client.id == client_id))
    db_client = result.scalar_one_or_none()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    for key, value in client.model_dump().items():
        setattr(db_client, key, value)
    
    await db.commit()
    await db.refresh(db_client)
    return db_client

@router.delete("/clients/{client_id}")
async def delete_client(client_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Client).where(models.Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    await db.delete(client)
    await db.commit()
    return {"message": "Client deleted successfully"}

# Contracts
@router.get("/contracts", response_model=List[schemas.ContractResponse])
async def get_contracts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Contract))
    contracts = result.scalars().all()
    return contracts

@router.post("/contracts", response_model=schemas.ContractResponse)
async def create_contract(contract: schemas.ContractCreate, db: AsyncSession = Depends(get_db)):
    db_contract = models.Contract(**contract.model_dump())
    db.add(db_contract)
    await db.commit()
    await db.refresh(db_contract)
    return db_contract

@router.delete("/contracts/{contract_id}")
async def delete_contract(contract_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Contract).where(models.Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    await db.delete(contract)
    await db.commit()
    return {"message": "Contract deleted successfully"}

# Projects
@router.get("/projects", response_model=List[schemas.ProjectResponse])
async def get_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Project))
    projects = result.scalars().all()
    return projects

@router.post("/projects", response_model=schemas.ProjectResponse)
async def create_project(project: schemas.ProjectCreate, db: AsyncSession = Depends(get_db)):
    db_project = models.Project(**project.model_dump())
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    return db_project

@router.get("/projects/{project_id}", response_model=schemas.ProjectResponse)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Project).where(models.Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.put("/projects/{project_id}", response_model=schemas.ProjectResponse)
async def update_project(project_id: int, project: schemas.ProjectCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Project).where(models.Project.id == project_id))
    db_project = result.scalar_one_or_none()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    for key, value in project.model_dump().items():
        setattr(db_project, key, value)
    
    await db.commit()
    await db.refresh(db_project)
    return db_project

@router.delete("/projects/{project_id}")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Project).where(models.Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(project)
    await db.commit()
    return {"message": "Project deleted successfully"}
