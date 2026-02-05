"""
Contracts Router - CRUD operations for Contracts
Extracted from commercial.py during modularization
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date
from typing import List

from app.database import get_db
from app.models import commercial as models
from app.schemas import commercial as schemas

router = APIRouter()


# ========== CONTRACTS CRUD ==========

@router.get("/contracts", response_model=List[schemas.ContractResponse])
async def get_contracts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Contract))
    contracts = result.scalars().all()
    
    # Calculate status dynamically
    today = date.today()
    for contract in contracts:
        if contract.end_date and contract.end_date < today:
            contract.status = "Vencido"
        else:
            contract.status = "Ativo"
            
    return contracts


@router.post("/contracts", response_model=schemas.ContractResponse)
async def create_contract(contract: schemas.ContractCreate, db: AsyncSession = Depends(get_db)):
    # 1. Get Client to get client_number
    result = await db.execute(select(models.Client).where(models.Client.id == contract.client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # 2. Determine Date components (YY, MM)
    ref_date = contract.signature_date or date.today()
    yy = ref_date.strftime("%y")
    mm = ref_date.strftime("%m")

    # 3. Determine Prefix and Count existing contracts
    # Prefix: CEL for LPU, CEC for Recorrente (or others)
    prefix_type = "CEL" if contract.contract_type == "LPU" else "CEC"
    
    # Append Company ID if present (e.g., CEL1, CEC2)
    prefix = f"{prefix_type}{contract.company_id}" if contract.company_id else prefix_type
    
    # Pattern: {PREFIX}_{YY}%
    pattern = f"{prefix}_{yy}%"
    result = await db.execute(select(func.count(models.Contract.id)).where(models.Contract.contract_number.like(pattern)))
    count = result.scalar() or 0
    next_number = count + 1

    # 4. Generate TAG
    nn = f"{next_number:02d}"
    ccc = client.client_number if client.client_number else "00" # Default to 00 if missing
    
    tag = f"{prefix}_{yy}{mm}_{ccc}_{nn}"

    # 5. Create Contract
    db_contract = models.Contract(**contract.model_dump())
    db_contract.contract_number = tag
    
    db.add(db_contract)
    await db.commit()
    await db.refresh(db_contract)
    
    # Set status for response
    today = date.today()
    if db_contract.end_date and db_contract.end_date < today:
        db_contract.status = "Vencido"
    else:
        db_contract.status = "Ativo"
        
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


@router.put("/contracts/{contract_id}", response_model=schemas.ContractResponse)
async def update_contract(contract_id: int, contract: schemas.ContractCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Contract).where(models.Contract.id == contract_id))
    db_contract = result.scalar_one_or_none()
    if not db_contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Update fields
    contract_data = contract.model_dump(exclude_unset=True)
    
    for key, value in contract_data.items():
        if key != "contract_number": # Protect TAG
            setattr(db_contract, key, value)
    
    await db.commit()
    await db.refresh(db_contract)
    
    # Set status for response
    today = date.today()
    if db_contract.end_date and db_contract.end_date < today:
        db_contract.status = "Vencido"
    else:
        db_contract.status = "Ativo"
        
    return db_contract
