from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from app.database import get_db
from app.models import assets as models
from app.schemas import assets as schemas

router = APIRouter()

# Fleet
@router.get("/fleet", response_model=List[schemas.FleetResponse])
async def get_fleet(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Fleet).options(selectinload(models.Fleet.insurance)))
    fleet = result.scalars().all()
    return fleet

# Insurance
@router.get("/insurances", response_model=List[schemas.InsuranceResponse])
async def get_insurances(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Insurance))
    insurances = result.scalars().all()
    return insurances

@router.post("/insurances", response_model=schemas.InsuranceResponse)
async def create_insurance(insurance: schemas.InsuranceCreate, db: AsyncSession = Depends(get_db)):
    db_insurance = models.Insurance(**insurance.model_dump())
    db.add(db_insurance)
    await db.commit()
    await db.refresh(db_insurance)
    return db_insurance

@router.put("/insurances/{insurance_id}", response_model=schemas.InsuranceResponse)
async def update_insurance(insurance_id: int, insurance: schemas.InsuranceCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Insurance).where(models.Insurance.id == insurance_id))
    db_insurance = result.scalar_one_or_none()
    if not db_insurance:
        raise HTTPException(status_code=404, detail="Insurance not found")
    
    for key, value in insurance.model_dump().items():
        setattr(db_insurance, key, value)
    
    await db.commit()
    await db.refresh(db_insurance)
    return db_insurance

@router.delete("/insurances/{insurance_id}")
async def delete_insurance(insurance_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Insurance).where(models.Insurance.id == insurance_id))
    insurance = result.scalar_one_or_none()
    if not insurance:
        raise HTTPException(status_code=404, detail="Insurance not found")
    await db.delete(insurance)
    await db.commit()
    return {"message": "Insurance deleted successfully"}

@router.post("/fleet", response_model=schemas.FleetResponse)
async def create_fleet_item(fleet: schemas.FleetCreate, db: AsyncSession = Depends(get_db)):
    db_fleet = models.Fleet(**fleet.model_dump())
    db.add(db_fleet)
    await db.commit()
    await db.refresh(db_fleet)
    return db_fleet

@router.put("/fleet/{fleet_id}", response_model=schemas.FleetResponse)
async def update_fleet_item(fleet_id: int, fleet: schemas.FleetCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Fleet).where(models.Fleet.id == fleet_id))
    db_fleet = result.scalar_one_or_none()
    if not db_fleet:
        raise HTTPException(status_code=404, detail="Fleet item not found")
    
    for key, value in fleet.model_dump().items():
        setattr(db_fleet, key, value)
    
    await db.commit()
    await db.refresh(db_fleet)
    return db_fleet

@router.delete("/fleet/{fleet_id}")
async def delete_fleet_item(fleet_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Fleet).where(models.Fleet.id == fleet_id))
    fleet = result.scalar_one_or_none()
    if not fleet:
        raise HTTPException(status_code=404, detail="Fleet item not found")
    await db.delete(fleet)
    await db.commit()
    return {"message": "Fleet item deleted successfully"}

# Tools
@router.get("/tools", response_model=List[schemas.ToolResponse])
async def get_tools(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Tool))
    tools = result.scalars().all()
    return tools

@router.post("/tools", response_model=schemas.ToolResponse)
async def create_tool(tool: schemas.ToolCreate, db: AsyncSession = Depends(get_db)):
    db_tool = models.Tool(**tool.model_dump())
    db.add(db_tool)
    await db.commit()
    await db.refresh(db_tool)
    return db_tool

@router.put("/tools/{tool_id}", response_model=schemas.ToolResponse)
async def update_tool(tool_id: int, tool: schemas.ToolCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Tool).where(models.Tool.id == tool_id))
    db_tool = result.scalar_one_or_none()
    if not db_tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    for key, value in tool.model_dump().items():
        setattr(db_tool, key, value)
    
    await db.commit()
    await db.refresh(db_tool)
    return db_tool

@router.delete("/tools/{tool_id}")
async def delete_tool(tool_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Tool).where(models.Tool.id == tool_id))
    tool = result.scalar_one_or_none()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    await db.delete(tool)
    await db.commit()
    return {"message": "Tool deleted successfully"}
