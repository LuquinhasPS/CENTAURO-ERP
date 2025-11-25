from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models import tickets as models
from app.schemas import tickets as schemas

router = APIRouter()

@router.get("/tickets", response_model=List[schemas.TicketResponse])
async def get_tickets(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Ticket))
    tickets = result.scalars().all()
    return tickets

@router.post("/tickets", response_model=schemas.TicketResponse)
async def create_ticket(ticket: schemas.TicketCreate, db: AsyncSession = Depends(get_db)):
    db_ticket = models.Ticket(**ticket.model_dump())
    db.add(db_ticket)
    await db.commit()
    await db.refresh(db_ticket)
    return db_ticket

@router.put("/tickets/{ticket_id}", response_model=schemas.TicketResponse)
async def update_ticket(ticket_id: int, ticket: schemas.TicketCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Ticket).where(models.Ticket.id == ticket_id))
    db_ticket = result.scalar_one_or_none()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    for key, value in ticket.model_dump().items():
        setattr(db_ticket, key, value)
    
    await db.commit()
    await db.refresh(db_ticket)
    return db_ticket

@router.delete("/tickets/{ticket_id}")
async def delete_ticket(ticket_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Ticket).where(models.Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await db.delete(ticket)
    await db.commit()
    return {"message": "Ticket deleted successfully"}
