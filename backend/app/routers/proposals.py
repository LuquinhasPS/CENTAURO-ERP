from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date, datetime, timedelta

from app.database import get_db
from app.models import proposals as models
from app.utils.timezone import now_brazil, today_brazil, end_of_day_brazil
from app.models import commercial as commercial_models
from app.schemas import proposals as schemas
from app.auth import get_current_active_user
from app.models.users import User

router = APIRouter(prefix="/commercial/proposals", tags=["Commercial Proposals"])


from fastapi import Query

@router.get("/", response_model=List[schemas.ProposalResponse])
async def get_proposals(
    skip: int = Query(0, ge=0),
    limit: int = Query(2000, ge=1, le=5000),
    status: Optional[List[schemas.ProposalStatus]] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    company_id: Optional[int] = Query(None),
    department: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(models.CommercialProposal)

    if status:
        stmt = stmt.where(models.CommercialProposal.status.in_(status))

    if company_id is not None:
        stmt = stmt.where(models.CommercialProposal.company_id == company_id)

    if department:
        # Filter by department. If department is COMERCIAL, show 'COMERCIAL' or NULLs (old records)
        if department == "COMERCIAL":
            stmt = stmt.where(
                or_(
                    models.CommercialProposal.crm_department == "COMERCIAL",
                    models.CommercialProposal.crm_department.is_(None)
                )
            )
        else:
            stmt = stmt.where(models.CommercialProposal.crm_department == department)

    if start_date or end_date:
        # Check if the filtering is strictly for GANHA/PERDIDA to use decision_date
        is_only_finalized = False
        if status and all(s in [schemas.ProposalStatus.GANHA, schemas.ProposalStatus.PERDIDA] for s in status):
            is_only_finalized = True

        if is_only_finalized:
            date_column = models.CommercialProposal.decision_date
        else:
            # Cast created_at (DateTime) to Date for the comparison
            date_column = func.date(models.CommercialProposal.created_at)

        if start_date:
            stmt = stmt.where(date_column >= start_date)
        if end_date:
            stmt = stmt.where(date_column <= end_date)

    result = await db.execute(stmt.order_by(desc(models.CommercialProposal.id)).offset(skip).limit(limit))
    proposals = result.scalars().all()
    return proposals


@router.get("/{id}", response_model=schemas.ProposalResponse)
async def get_proposal(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.CommercialProposal).where(models.CommercialProposal.id == id))
    proposal = result.scalar_one_or_none()
    
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    return proposal



@router.post("/", response_model=schemas.ProposalResponse)
async def create_proposal(proposal: schemas.ProposalCreate, db: AsyncSession = Depends(get_db)):
    try:
        # Import models inside to avoid circular dependencies
        from app.models.commercial import Project, Contract
        
        # 1. TAG manual — normalizar e validar unicidade
        internal_id = proposal.internal_id.strip().upper()
        
        # Validar unicidade em Propostas
        existing_prop = await db.execute(
            select(models.CommercialProposal).where(models.CommercialProposal.internal_id == internal_id)
        )
        if existing_prop.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Esta TAG de Proposta já está em uso.")
            
        # Validar unicidade em Projetos
        existing_project = await db.execute(
            select(Project).where(Project.tag == internal_id)
        )
        if existing_project.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Esta TAG já está em uso em um Projeto.")
            
        # Validar unicidade em Contratos
        existing_contract = await db.execute(
            select(Contract).where(Contract.contract_number == internal_id)
        )
        if existing_contract.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Esta TAG já está em uso em um Contrato.")

        # Create DB object
        # Extract fields that are actually in the model to avoid constructor errors
        exclude_fields = {"internal_id"}
        payload_data = proposal.model_dump(exclude=exclude_fields)
        
        db_proposal = models.CommercialProposal(**payload_data)
        db_proposal.internal_id = internal_id
        
        db.add(db_proposal)
        await db.commit()
        await db.refresh(db_proposal)
        
        return db_proposal
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR creating proposal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao criar proposta: {str(e)}")


@router.put("/{id}", response_model=schemas.ProposalResponse)
async def update_proposal(id: int, proposal_update: schemas.ProposalUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.CommercialProposal).where(models.CommercialProposal.id == id))
    db_proposal = result.scalar_one_or_none()
    
    if not db_proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    
    update_data = proposal_update.model_dump(exclude_unset=True)
    
    # Auto-fill logic for decision_date
    if "status" in update_data:
        new_status = update_data["status"]
        if new_status in [schemas.ProposalStatus.GANHA, schemas.ProposalStatus.PERDIDA]:
            update_data["decision_date"] = date.today()
        else:
            update_data["decision_date"] = None
            
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

    # 3. Determine if it's a Contract or Project
    if proposal.crm_department == "ENGENHARIA" or proposal.contract_id:
        is_contract = False
    else:
        is_contract = proposal.proposal_type in ["RECORRENTE", "LPU"]
    
    # ============================================================
    # [SUSPENSA] Geração automática de TAG suspensa até fim do ano.
    # Os blocos abaixo foram comentados. A TAG agora vem do payload.
    # Para reverter, descomente os blocos e remova o bloco manual.
    # ============================================================
    
    # # Variáveis de data usadas na geração automática (AUTOMÁTICO — COMENTADO)
    # today = date.today()
    # ref_date = convert_data.start_date
    # yy = ref_date.strftime("%y")
    # mm = ref_date.strftime("%m")
    # ccc = client.client_number if client.client_number else "00"

    # TAG manual — normalizar e validar unicidade
    tag = convert_data.tag.strip().upper()
    
    # Verificar se a TAG já existe em Projetos
    existing_project = await db.execute(
        select(commercial_models.Project).where(commercial_models.Project.tag == tag)
    )
    if existing_project.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Esta TAG já está em uso no sistema.")
    
    # Verificar se a TAG já existe em Contratos
    existing_contract = await db.execute(
        select(commercial_models.Contract).where(commercial_models.Contract.contract_number == tag)
    )
    if existing_contract.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Esta TAG já está em uso no sistema.")
        
    # Verificar se a TAG já existe em Propostas (EXCETO a proposta atual que está sendo convertida)
    existing_prop = await db.execute(
        select(models.CommercialProposal).where(
            models.CommercialProposal.internal_id == tag,
            models.CommercialProposal.id != id
        )
    )
    if existing_prop.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Esta TAG já está em uso em uma Proposta.")
    
    if is_contract:
        # # Generate Contract TAG (CEC or CEL) (AUTOMÁTICO — COMENTADO)
        # prefix_type = "CEL" if proposal.proposal_type == "LPU" else "CEC"
        # prefix_base = f"{prefix_type}{convert_data.company_id}" if convert_data.company_id else prefix_type
        # 
        # pattern = f"{prefix_base}_{yy}%"
        # result = await db.execute(select(func.count(commercial_models.Contract.id)).where(commercial_models.Contract.contract_number.like(pattern)))
        # count = result.scalar() or 0
        # next_number = count + 1
        # nn = f"{next_number:02d}"
        # 
        # tag = f"{prefix_base}_{yy}{mm}_{ccc}_{nn}"
        
        # Create Contract
        contract_type = commercial_models.ContractType.LPU if proposal.proposal_type == "LPU" else commercial_models.ContractType.RECORRENTE
        
        new_entity = commercial_models.Contract(
            client_id=client_id,
            title=proposal.title,
            description=convert_data.project_scope or proposal.description,
            contract_number=tag,
            signature_date=convert_data.start_date or convert_data.estimated_start_date,
            value=proposal.value,
            monthly_value=proposal.value if contract_type == commercial_models.ContractType.RECORRENTE else None,
            contract_type=contract_type,
            company_id=convert_data.company_id
        )
        entity_type = "Contrato"
        
    else:
        # # Generate Project TAG (CEP) (AUTOMÁTICO — COMENTADO)
        # prefix_base = f"CEP{convert_data.company_id}" if convert_data.company_id else "CEP"
        # 
        # pattern = f"{prefix_base}_{yy}%"
        # result = await db.execute(select(func.count(commercial_models.Project.id)).where(commercial_models.Project.tag.like(pattern)))
        # count = result.scalar() or 0
        # next_number = count + 1
        # nn = f"{next_number:02d}"
        # 
        # tag = f"{prefix_base}_{yy}{mm}_{ccc}_{nn}"
        
        # Create Project
        if convert_data.budget is not None and format(convert_data.budget, ".2f") != format(proposal.value or 0, ".2f"):
            service_value = convert_data.budget
            material_value = 0
            budget = convert_data.budget
        else:
            service_value = proposal.labor_value if proposal.labor_value is not None else (proposal.value or 0)
            material_value = proposal.material_value if proposal.material_value is not None else 0
            budget = proposal.value or 0

        new_entity = commercial_models.Project(
            tag=tag,
            # project_number=next_number,  # [SUSPENSA] Numeração automática
            name=proposal.title,
            scope=convert_data.project_scope or proposal.description,
            coordinator=convert_data.coordinator,
            status="Aprovado",
            client_id=client_id,
            contract_id=proposal.contract_id,
            service_value=service_value,
            material_value=material_value,
            budget=budget,
            start_date=convert_data.start_date,
            end_date=None,
            estimated_start_date=convert_data.estimated_start_date,
            estimated_end_date=convert_data.estimated_end_date,
            company_id=convert_data.company_id,
            estimated_days=convert_data.estimated_days,
            warranty_months=convert_data.warranty_months,
            directory_url=convert_data.directory_url
        )
        entity_type = "Projeto"
        
    db.add(new_entity)
    await db.commit()
    await db.refresh(new_entity)
    
    # 5. Update Proposal
    proposal.status = schemas.ProposalStatus.GANHA
    proposal.decision_date = date.today()
    if is_contract:
        proposal.converted_contract_id = new_entity.id
    else:
        proposal.converted_project_id = new_entity.id
        
    if not proposal.client_id:  # Link client if it wasn't linked
        proposal.client_id = client_id
    
    await db.commit()
    
    return {
        "message": f"{entity_type} criado com sucesso!", 
        "entity_id": new_entity.id, 
        "entity_tag": tag
    }



@router.get("/tasks/pending")
async def get_pending_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Listar tarefas pendentes (vencidas ou para hoje).
    Retorna: {id, title, due_date, proposal_title, client_name, is_overdue}
    """
    today = today_brazil()
    # End of today (Brasilia Time) - strip tzinfo for naive DateTime column (PostgreSQL compat)
    end_of_day = end_of_day_brazil(today).replace(tzinfo=None)

    stmt = (
        select(models.ProposalTask)
        .join(models.CommercialProposal)
        .options(
            selectinload(models.ProposalTask.proposal).selectinload(models.CommercialProposal.client)
        )
        .where(
            models.ProposalTask.is_completed == False,
            models.ProposalTask.due_date <= end_of_day
        )
    )

    # Filter by responsible user if not superuser
    if not current_user.is_superuser:
        user_name = current_user.collaborator.name if current_user.collaborator else None
        if user_name:
            stmt = stmt.where(models.CommercialProposal.responsible == user_name)
        else:
            # Force no results if user has no linked collaborator name
            stmt = stmt.where(models.CommercialProposal.responsible == "___HIDDEN_NO_COLLAB___")

    result = await db.execute(stmt.order_by(models.ProposalTask.due_date))
    tasks = result.scalars().all()

    response = []
    for task in tasks:
        proposal = task.proposal
        # Client name logic: proposal.client_name OR client.name OR "N/A"
        client_name = proposal.client_name
        if not client_name and proposal.client:
            client_name = proposal.client.name
        
        if not client_name:
            client_name = "N/A"

        is_overdue = task.due_date.date() < today

        response.append({
            "id": task.id,
            "title": task.title,
            "due_date": task.due_date,
            "recurrence_days": task.recurrence_days,
            "proposal_id": proposal.id,
            "proposal_title": proposal.title,
            "client_name": client_name,
            "is_overdue": is_overdue
        })

    return response


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
    
    # Handle timezone aware datetimes for PostgreSQL naive columns
    task_data = task.model_dump()
    if task_data.get('due_date') and task_data['due_date'].tzinfo:
        task_data['due_date'] = task_data['due_date'].replace(tzinfo=None)
        
    db_task = models.ProposalTask(
        proposal_id=proposal_id,
        **task_data
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
    
    # Handle timezone aware datetimes for PostgreSQL
    if update_data.get('due_date') and update_data['due_date'].tzinfo:
        update_data['due_date'] = update_data['due_date'].replace(tzinfo=None)
        
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
    db_task.completed_at = now_brazil().replace(tzinfo=None)
    
    next_task_created = False
    new_task_id = None
    
    # Se é recorrente e ainda está ativa, criar próxima tarefa automaticamente
    if db_task.recurrence_days and db_task.is_active:
        next_due_date = (now_brazil() + timedelta(days=db_task.recurrence_days)).replace(tzinfo=None)
        
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
