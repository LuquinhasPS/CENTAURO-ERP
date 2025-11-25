from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.database import get_db
from app.models import purchases as models
from app.schemas import purchases as schemas

router = APIRouter()

@router.get("/purchases", response_model=List[schemas.PurchaseRequestResponse])
async def get_purchases(
    project_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    query = select(models.PurchaseRequest)
    if project_id:
        query = query.where(models.PurchaseRequest.project_id == project_id)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/purchases", response_model=schemas.PurchaseRequestResponse)
async def create_purchase(purchase: schemas.PurchaseRequestCreate, db: AsyncSession = Depends(get_db)):
    db_purchase = models.PurchaseRequest(**purchase.model_dump())
    db.add(db_purchase)
    await db.commit()
    await db.refresh(db_purchase)
    return db_purchase

@router.put("/purchases/{id}", response_model=schemas.PurchaseRequestResponse)
async def update_purchase(id: int, purchase: schemas.PurchaseRequestCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.PurchaseRequest).where(models.PurchaseRequest.id == id))
    db_purchase = result.scalar_one_or_none()
    if not db_purchase:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    
    for key, value in purchase.model_dump().items():
        setattr(db_purchase, key, value)
    
    await db.commit()
    await db.refresh(db_purchase)
    return db_purchase

@router.delete("/purchases/{id}")
async def delete_purchase(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.PurchaseRequest).where(models.PurchaseRequest.id == id))
    db_purchase = result.scalar_one_or_none()
    if not db_purchase:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    
    await db.delete(db_purchase)
    await db.commit()
    return {"message": "Purchase request deleted"}
