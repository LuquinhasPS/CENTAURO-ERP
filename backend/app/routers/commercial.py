from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload, joinedload
from datetime import date
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
    result = await db.execute(select(models.Project).options(selectinload(models.Project.billings)))
    projects = result.scalars().all()
    
    # Convert each project to dict to avoid Pydantic triggering lazy loads
    project_list = []
    for p in projects:
        invoiced = sum(b.value for b in p.billings) if p.billings else 0
        project_dict = {
            "id": p.id,
            "tag": p.tag,
            "project_number": p.project_number,
            "name": p.name,
            "scope": p.scope,
            "coordinator": p.coordinator,
            "contract_id": p.contract_id,
            "client_id": p.client_id,
            "team_size": p.team_size,
            "service_value": p.service_value,
            "material_value": p.material_value,
            "budget": p.budget,
            "start_date": p.start_date,
            "end_date": p.end_date,
            "estimated_start_date": p.estimated_start_date,
            "estimated_end_date": p.estimated_end_date,
            "billings": [{"id": b.id, "value": b.value, "date": b.date, "invoice_number": getattr(b, 'invoice_number', None), "description": b.description, "project_id": b.project_id} for b in p.billings],
            "invoiced": invoiced
        }
        project_list.append(project_dict)
    
    return project_list

@router.post("/projects", response_model=schemas.ProjectResponse)
async def create_project(project: schemas.ProjectCreate, db: AsyncSession = Depends(get_db)):
    # 1. Get Client to get client_number
    result = await db.execute(select(models.Client).where(models.Client.id == project.client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # 2. Determine Project Number
    if project.project_number:
        next_number = project.project_number
    else:
        result = await db.execute(select(models.Project.project_number).order_by(models.Project.project_number.desc()).limit(1))
        max_number = result.scalar_one_or_none()
        next_number = (max_number or 0) + 1
    
    # 3. Generate Tag
    today = date.today()
    mm = today.strftime("%m")
    yy = today.strftime("%y")
    nn = f"{next_number:02d}"
    ccc = client.client_number if client.client_number else "000"
    
    tag = f"CE{mm}{nn}{yy}_{ccc}"
    
    # Create DB object
    db_project = models.Project(**project.model_dump(exclude={"tag"}))
    db_project.tag = tag
    db_project.project_number = next_number
    
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    
    # Explicitly set relationships/calculated fields to avoid async loading issues during serialization
    # Convert to dict to avoid Pydantic triggering lazy loads on the ORM object
    project_dict = {
        "id": db_project.id,
        "tag": db_project.tag,
        "project_number": db_project.project_number,
        "name": db_project.name,
        "scope": db_project.scope,
        "coordinator": db_project.coordinator,
        "contract_id": db_project.contract_id,
        "client_id": db_project.client_id,
        "team_size": db_project.team_size,
        "service_value": db_project.service_value,
        "material_value": db_project.material_value,
        "budget": db_project.budget,
        "start_date": db_project.start_date,
        "end_date": db_project.end_date,
        "estimated_start_date": db_project.estimated_start_date,
        "estimated_end_date": db_project.estimated_end_date,
        "billings": [],
        "invoiced": 0
    }
    
    return project_dict

@router.post("/projects/{project_id}/billings", response_model=schemas.ProjectBillingResponse)
async def create_project_billing(project_id: int, billing: schemas.ProjectBillingCreate, db: AsyncSession = Depends(get_db)):
    db_billing = models.ProjectBilling(**billing.model_dump(), project_id=project_id)
    db.add(db_billing)
    await db.commit()
    await db.refresh(db_billing)
    return db_billing

@router.delete("/projects/billings/{billing_id}")
async def delete_project_billing(billing_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.ProjectBilling).where(models.ProjectBilling.id == billing_id))
    billing = result.scalar_one_or_none()
    if not billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    await db.delete(billing)
    await db.commit()
    return {"message": "Billing deleted"}

@router.get("/projects/{project_id}", response_model=schemas.ProjectResponse)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Project).options(selectinload(models.Project.billings)).where(models.Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Calculate invoiced
    project.invoiced = sum(b.value for b in project.billings) if project.billings else 0
    
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
    
    # Convert to dict to avoid Pydantic triggering lazy loads on the ORM object
    # Fetch billings to calculate invoiced
    result_billings = await db.execute(select(models.ProjectBilling).where(models.ProjectBilling.project_id == project_id))
    billings = result_billings.scalars().all()
    invoiced = sum(b.value for b in billings) if billings else 0
    
    project_dict = {
        "id": db_project.id,
        "tag": db_project.tag,
        "project_number": db_project.project_number,
        "name": db_project.name,
        "scope": db_project.scope,
        "coordinator": db_project.coordinator,
        "contract_id": db_project.contract_id,
        "client_id": db_project.client_id,
        "team_size": db_project.team_size,
        "service_value": db_project.service_value,
        "material_value": db_project.material_value,
        "budget": db_project.budget,
        "start_date": db_project.start_date,
        "end_date": db_project.end_date,
        "estimated_start_date": db_project.estimated_start_date,
        "estimated_end_date": db_project.estimated_end_date,
        "billings": [{"id": b.id, "value": b.value, "date": b.date, "invoice_number": getattr(b, 'invoice_number', None), "description": b.description, "project_id": b.project_id} for b in billings],
        "invoiced": invoiced
    }
    
    return project_dict

@router.delete("/projects/{project_id}")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Project).where(models.Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(project)
    await db.commit()
    return {"message": "Project deleted successfully"}
