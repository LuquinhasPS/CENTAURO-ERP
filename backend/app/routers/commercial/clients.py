"""
Clients Router - CRUD operations for Clients and Client Contacts
Extracted from commercial.py during modularization
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.database import get_db
from app.models import commercial as models
from app.models.client_contacts import ClientContact
from app.schemas import commercial as schemas
from app.utils.messages import Msg

router = APIRouter()


from sqlalchemy import func
from app.models.commercial import Project
from app.models.finance import ProjectBilling, BillingStatus

# ========== CLIENTS CRUD ==========

@router.get("/clients", response_model=List[schemas.ClientResponse])
async def get_clients(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.Client).options(selectinload(models.Client.contacts))
    )
    clients_db = result.scalars().all()
    
    # Compute total_faturado per client from their projects
    stmt = (
        select(Project.client_id, func.sum(ProjectBilling.gross_value).label("total"))
        .join(ProjectBilling, Project.id == ProjectBilling.project_id)
        .where(ProjectBilling.status == BillingStatus.PAGO)
        .group_by(Project.client_id)
    )
    billing_sums = await db.execute(stmt)
    sums_map = {row.client_id: row.total or 0.0 for row in billing_sums.all()}
    
    clients_resp = []
    for c in clients_db:
        c_obj = schemas.ClientResponse.model_validate(c)
        c_obj.total_faturado = sums_map.get(c.id, 0.0)
        clients_resp.append(c_obj)
        
    return clients_resp


@router.post("/clients", response_model=schemas.ClientResponse)
async def create_client(client: schemas.ClientCreate, db: AsyncSession = Depends(get_db)):
    db_client = models.Client(**client.model_dump())
    db.add(db_client)
    await db.commit()
    
    # Reload with relationships
    result = await db.execute(select(models.Client).options(selectinload(models.Client.contacts)).where(models.Client.id == db_client.id))
    db_client_loaded = result.scalar_one()
    
    return db_client_loaded


@router.put("/clients/{client_id}", response_model=schemas.ClientResponse)
async def update_client(client_id: int, client: schemas.ClientCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Client).options(selectinload(models.Client.contacts)).where(models.Client.id == client_id))
    db_client = result.scalar_one_or_none()
    if not db_client:
        raise HTTPException(status_code=404, detail=Msg.CLIENT_NOT_FOUND)
    
    for key, value in client.model_dump().items():
        setattr(db_client, key, value)
    
    await db.commit()
    
    # Reload with relationships
    result = await db.execute(select(models.Client).options(selectinload(models.Client.contacts)).where(models.Client.id == db_client.id))
    db_client_loaded = result.scalar_one()
    
    return db_client_loaded


@router.delete("/clients/{client_id}")
async def delete_client(client_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Client).where(models.Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail=Msg.CLIENT_NOT_FOUND)
    await db.delete(client)
    await db.commit()
    return {"message": Msg.CLIENT_DELETED}


# ========== CLIENT CONTACTS ==========

@router.post("/clients/{client_id}/contacts", response_model=schemas.ClientContactResponse)
async def add_client_contact(client_id: int, contact: schemas.ClientContactCreate, db: AsyncSession = Depends(get_db)):
    # Verify client exists
    result = await db.execute(select(models.Client).where(models.Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail=Msg.CLIENT_NOT_FOUND)
    
    db_contact = ClientContact(**contact.model_dump(), client_id=client_id)
    db.add(db_contact)
    await db.commit()
    await db.refresh(db_contact)
    return db_contact


@router.put("/clients/contacts/{contact_id}", response_model=schemas.ClientContactResponse)
async def update_client_contact(contact_id: int, contact: schemas.ClientContactCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ClientContact).where(ClientContact.id == contact_id))
    db_contact = result.scalar_one_or_none()
    if not db_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    for key, value in contact.model_dump().items():
        setattr(db_contact, key, value)
    
    await db.commit()
    await db.refresh(db_contact)
    return db_contact


@router.delete("/clients/contacts/{contact_id}")
async def delete_client_contact(contact_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ClientContact).where(ClientContact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    await db.delete(contact)
    await db.commit()
    return {"message": "Contact deleted successfully"}
