from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc
from sqlalchemy.orm import selectinload
from typing import List
from datetime import date, datetime, timedelta

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
        material_value=0,  # Default
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
    if not proposal.client_id:  # Link client if it wasn't linked
        proposal.client_id = client_id
    
    await db.commit()
    
    return {"message": "Projeto criado com sucesso", "project_id": new_project.id, "project_tag": new_project.tag}


# --- TASK CRUD ENDPOINTS (Follow-up Recorrente) ---

@router.get("/{proposal_id}/tasks", response_model=List[schemas.ProposalTaskResponse])
async def get_proposal_tasks(proposal_id: int, db: AsyncSession = Depends(get_db)):
    """Listar todas as tarefas de uma proposta"""
    result = await db.execute(
        select(models.ProposalTask)
        .where(models.ProposalTask.proposal_id == proposal_id)
        .order_by(models.ProposalTask.due_date)
    )
    tasks = result.scalars().all()
    return tasks


@router.post("/{proposal_id}/tasks", response_model=schemas.ProposalTaskResponse)
async def create_proposal_task(proposal_id: int, task: schemas.ProposalTaskCreate, db: AsyncSession = Depends(get_db)):
    """Criar nova tarefa de follow-up (com recorrência opcional)"""
    # Validate proposal exists
    result = await db.execute(select(models.CommercialProposal).where(models.CommercialProposal.id == proposal_id))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    db_task = models.ProposalTask(
        proposal_id=proposal_id,
        **task.model_dump()
    )
    db.add(db_task)
    await db.commit()
    await db.refresh(db_task)
    return db_task


@router.put("/tasks/{task_id}", response_model=schemas.ProposalTaskResponse)
async def update_proposal_task(task_id: int, task_update: schemas.ProposalTaskUpdate, db: AsyncSession = Depends(get_db)):
    """Atualizar uma tarefa"""
    result = await db.execute(select(models.ProposalTask).where(models.ProposalTask.id == task_id))
    db_task = result.scalar_one_or_none()
    
    if not db_task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    update_data = task_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task, key, value)
    
    await db.commit()
    await db.refresh(db_task)
    return db_task


@router.delete("/tasks/{task_id}")
async def delete_proposal_task(task_id: int, db: AsyncSession = Depends(get_db)):
    """Deletar uma tarefa"""
    result = await db.execute(select(models.ProposalTask).where(models.ProposalTask.id == task_id))
    db_task = result.scalar_one_or_none()
    
    if not db_task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    await db.delete(db_task)
    await db.commit()
    return {"message": "Tarefa excluída com sucesso"}


@router.post("/tasks/{task_id}/complete", response_model=dict)
async def complete_proposal_task(task_id: int, db: AsyncSession = Depends(get_db)):
    """
    Marcar tarefa como concluída.
    Se for recorrente e ativa, cria automaticamente a próxima tarefa.
    """
    result = await db.execute(select(models.ProposalTask).where(models.ProposalTask.id == task_id))
    db_task = result.scalar_one_or_none()
    
    if not db_task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    # Mark as completed
    db_task.is_completed = True
    db_task.completed_at = datetime.utcnow()
    
    next_task_created = False
    new_task_id = None
    
    # Se é recorrente e ainda está ativa, criar próxima tarefa automaticamente
    if db_task.recurrence_days and db_task.is_active:
        next_due_date = datetime.utcnow() + timedelta(days=db_task.recurrence_days)
        
        new_task = models.ProposalTask(
            proposal_id=db_task.proposal_id,
            title=db_task.title,
            due_date=next_due_date,
            recurrence_days=db_task.recurrence_days,
            is_active=True,
            is_completed=False
        )
        db.add(new_task)
        await db.commit()
        await db.refresh(new_task)
        next_task_created = True
        new_task_id = new_task.id
    
    await db.commit()
    
    return {
        "message": "Tarefa concluída com sucesso",
        "next_task_created": next_task_created,
        "new_task_id": new_task_id
    }


@router.post("/tasks/{task_id}/stop-recurrence", response_model=schemas.ProposalTaskResponse)
async def stop_task_recurrence(task_id: int, db: AsyncSession = Depends(get_db)):
    """Parar a recorrência de uma tarefa (cliente respondeu, não precisa mais cobrar)"""
    result = await db.execute(select(models.ProposalTask).where(models.ProposalTask.id == task_id))
    db_task = result.scalar_one_or_none()
    
    if not db_task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    db_task.is_active = False
    await db.commit()
    await db.refresh(db_task)
    
    return db_task
