from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc
from typing import List
from datetime import date

from app.database import get_db
from app.models import proposals as models
from app.models import commercial as commercial_models
from app.schemas import proposals as schemas

router = APIRouter(prefix="/commercial/proposals", tags=["Commercial Proposals"])

@router.get("/", response_model=List[schemas.ProposalResponse])
async def get_proposals(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.CommercialProposal).order_by(desc(models.CommercialProposal.id)).offset(skip).limit(limit))
    proposals = result.scalars().all()
    return proposals

@router.post("/", response_model=schemas.ProposalResponse)
async def create_proposal(proposal: schemas.ProposalCreate, db: AsyncSession = Depends(get_db)):
    db_proposal = models.CommercialProposal(**proposal.model_dump())
    db.add(db_proposal)
    await db.commit()
    await db.refresh(db_proposal)
    
    # Generate internal ID: PROP-{id}
    db_proposal.internal_id = f"PROP-{db_proposal.id}"
    await db.commit()
    await db.refresh(db_proposal)
    
    return db_proposal

@router.put("/{id}", response_model=schemas.ProposalResponse)
async def update_proposal(id: int, proposal_update: schemas.ProposalUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.CommercialProposal).where(models.CommercialProposal.id == id))
    db_proposal = result.scalar_one_or_none()
    
    if not db_proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    update_data = proposal_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_proposal, key, value)
    
    await db.commit()
    await db.refresh(db_proposal)
    return db_proposal

@router.delete("/{id}")
async def delete_proposal(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.CommercialProposal).where(models.CommercialProposal.id == id))
    db_proposal = result.scalar_one_or_none()
    
    if not db_proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    await db.delete(db_proposal)
    await db.commit()
    return {"message": "Proposta excluída com sucesso"}

@router.post("/{id}/convert", response_model=dict)
async def convert_proposal_to_project(id: int, convert_data: schemas.ProposalConvertRequest, db: AsyncSession = Depends(get_db)):
    # 1. Get Proposal
    result = await db.execute(select(models.CommercialProposal).where(models.CommercialProposal.id == id))
    proposal = result.scalar_one_or_none()
    
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    if proposal.converted_project_id:
        raise HTTPException(status_code=400, detail="Esta proposta já foi convertida em projeto.")

    # 2. Validate Client
    client_id = convert_data.client_id or proposal.client_id
    if not client_id:
        raise HTTPException(status_code=400, detail="É necessário vincular um cliente válido antes de converter.")
    
    result = await db.execute(select(commercial_models.Client).where(commercial_models.Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
         raise HTTPException(status_code=404, detail="Cliente não encontrado.")

    # 3. Generate Project TAG (Logic copied from commercial.py)
    today = date.today()
    ref_date = convert_data.start_date
    yy = ref_date.strftime("%y")
    mm = ref_date.strftime("%m")
    ccc = client.client_number if client.client_number else "00"
    
    # Prefix
    prefix_base = f"CEP{convert_data.company_id}" if convert_data.company_id else "CEP"
    
    # Count sequential
    pattern = f"{prefix_base}_{yy}%"
    result = await db.execute(select(func.count(commercial_models.Project.id)).where(commercial_models.Project.tag.like(pattern)))
    count = result.scalar() or 0
    next_number = count + 1
    nn = f"{next_number:02d}"
    
    tag = f"{prefix_base}_{yy}{mm}_{ccc}_{nn}"
    
    # 4. Create Project
    budget = convert_data.budget if convert_data.budget is not None else proposal.value
    # Assume entire budget is Service Value for now, or split? 
    # Let's put budget as budget, and service_value as budget (safe default for services company)
    
    new_project = commercial_models.Project(
        tag=tag,
        project_number=next_number,
        name=proposal.title,
        scope=convert_data.project_scope or proposal.description or proposal.title,
        coordinator=convert_data.coordinator,
        status="Em Andamento",
        client_id=client_id,
        service_value=budget,
        material_value=0, # Default
        budget=budget,
        start_date=convert_data.start_date,
        company_id=convert_data.company_id,
        estimated_days=convert_data.estimated_days,
        warranty_months=convert_data.warranty_months,
        estimated_start_date=convert_data.start_date
        # estimated_end_date logic could be added based on estimated_days
    )
    
    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)
    
    # 5. Update Proposal
    proposal.status = schemas.ProposalStatus.GANHA
    proposal.converted_project_id = new_project.id
    if not proposal.client_id: # Link client if it wasn't linked
        proposal.client_id = client_id
    
    await db.commit()
    
    return {"message": "Projeto criado com sucesso", "project_id": new_project.id, "project_tag": new_project.tag}
