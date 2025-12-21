from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload, joinedload
from datetime import date, datetime
from typing import List
from app.database import get_db
from app.models import commercial as models
from app.models.users import User # Import User explicitly to fix models.User reference
from app.schemas import commercial as schemas
from app.auth import get_current_active_user

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
    prefix = "CEL" if contract.contract_type == "LPU" else "CEC"
    
    # Pattern: {PREFIX}_{YY}%
    pattern = f"{prefix}_{yy}%"
    result = await db.execute(select(func.count(models.Contract.id)).where(models.Contract.contract_number.like(pattern)))
    count = result.scalar() or 0
    next_number = count + 1

    # 4. Generate TAG
    nn = f"{next_number:02d}"
    ccc = client.client_number if client.client_number else "00" # Default to 00 if missing
    
    tag = f"{prefix}_{yy}{mm}_{nn}_{ccc}"

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

# Projects
@router.get("/projects", response_model=List[schemas.ProjectResponse])
async def get_projects(db: AsyncSession = Depends(get_db)):
    # Check for expired projects and update status
    today = date.today()
    
    # Find active projects that have expired
    result = await db.execute(
        select(models.Project).where(
            models.Project.end_date < today,
            models.Project.status != "Finalizado",
            models.Project.status != "Cancelado" # Optional: don't touch cancelled ones
        )
    )
    expired_projects = result.scalars().all()
    
    if expired_projects:
        for project in expired_projects:
            project.status = "Finalizado"
        await db.commit()

    result = await db.execute(
        select(models.Project).options(
            selectinload(models.Project.billings),
            selectinload(models.Project.client)
        )
    )
    projects = result.scalars().all()
    
    # Convert each project to dict to avoid Pydantic triggering lazy loads
    project_list = []
    for p in projects:
        invoiced = sum(b.value for b in p.billings if b.status == models.BillingStatus.PAGO) if p.billings else 0
        project_dict = {
            "id": p.id,
            "tag": p.tag,
            "project_number": p.project_number,
            "name": p.name,
            "scope": p.scope,
            "coordinator": p.coordinator,
            "contract_id": p.contract_id,
            "client_id": p.client_id,
            "client_name": p.client.name if p.client else None,
            "team_size": p.team_size,
            "service_value": p.service_value,
            "material_value": p.material_value,
            "budget": p.budget,
            "start_date": p.start_date,
            "end_date": p.end_date,
            "estimated_start_date": p.estimated_start_date,
            "estimated_end_date": p.estimated_end_date,
            "status": p.status,
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
    
    # 2. Determine Project Number and TAG
    today = date.today()
    ref_date = project.start_date or today
    yy = ref_date.strftime("%y")
    mm = ref_date.strftime("%m")
    ccc = client.client_number if client.client_number else "00"

    tag = ""
    next_number = 0

    if project.contract_id:
        # Linked Project: CEC_(...)_{Contract}_P{Seq}
        # Get Contract TAG
        result = await db.execute(select(models.Contract).where(models.Contract.id == project.contract_id))
        contract = result.scalar_one_or_none()
        if not contract:
             raise HTTPException(status_code=404, detail="Contract not found")
        
        contract_tag = contract.contract_number
        
        # Count projects for this contract
        result = await db.execute(select(func.count(models.Project.id)).where(models.Project.contract_id == project.contract_id))
        count = result.scalar() or 0
        next_number = count + 1
        
        tag = f"{contract_tag}_P{next_number:02d}"
        
    else:
        # Standalone Project: CEP_{YY}{MM}_{Seq}_{Client}
        # Count standalone projects for this year
        pattern = f"CEP_{yy}%"
        result = await db.execute(select(func.count(models.Project.id)).where(models.Project.tag.like(pattern)))
        count = result.scalar() or 0
        next_number = count + 1
        
        nn = f"{next_number:02d}"
        tag = f"CEP_{yy}{mm}_{nn}_{ccc}"
    
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
        "status": db_project.status,
        "billings": [],
        "invoiced": 0
    }
    
    return project_dict

@router.get("/projects/{project_id}", response_model=schemas.ProjectResponse)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    from app.models import finance_payroll as finance_models # Import here to avoid circular dependency
    
    result = await db.execute(select(models.Project).options(selectinload(models.Project.billings)).where(models.Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Apply Overdue Logic for Billings
    today = date.today()
    updated = False
    if project.billings:
        for b in project.billings:
            if b.status == models.BillingStatus.EMITIDA and b.date and b.date < today:
                b.status = models.BillingStatus.VENCIDA
                db.add(b)
                updated = True
    
    if updated:
        await db.commit()
        # No need to re-fetch as we modified the objects in session
    
    # Calculate invoiced
    project.invoiced = sum(b.value for b in project.billings if b.status == models.BillingStatus.PAGO) if project.billings else 0

    # Calculate Total Labor Cost (Performance Guardrail: Only in get_project)
    labor_result = await db.execute(
        select(func.sum(finance_models.ProjectLaborCost.cost_value))
        .where(finance_models.ProjectLaborCost.project_id == project_id)
    )
    labor_cost = labor_result.scalar() or 0
    project.total_labor_cost = labor_cost
    
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
    invoiced = sum(b.value for b in billings if b.status == models.BillingStatus.PAGO) if billings else 0
    
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
        "status": db_project.status,
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

# Billings
@router.post("/projects/{project_id}/billings", response_model=schemas.ProjectBillingResponse)
async def create_project_billing(project_id: int, billing: schemas.ProjectBillingCreate, db: AsyncSession = Depends(get_db)):
    # Default status to PREVISTO if not provided (though schema might have default)
    billing_data = billing.model_dump()
    if 'status' not in billing_data or not billing_data['status']:
        billing_data['status'] = models.BillingStatus.PREVISTO
        
    db_billing = models.ProjectBilling(**billing_data, project_id=project_id)
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
    
    if billing.status != models.BillingStatus.PREVISTO:
        raise HTTPException(status_code=400, detail="Apenas faturamentos com status PREVISTO podem ser excluídos.")

    await db.delete(billing)
    await db.commit()
    return {"message": "Billing deleted"}

@router.get("/billings", response_model=List[schemas.ProjectBillingResponse])
async def get_all_billings(db: AsyncSession = Depends(get_db)):
    # 1. Fetch all billings
    result = await db.execute(select(models.ProjectBilling))
    billings = result.scalars().all()
    
    # 2. Apply Overdue Logic
    today = date.today()
    updated = False
    for b in billings:
        if b.status == models.BillingStatus.EMITIDA and b.date and b.date < today:
            b.status = models.BillingStatus.VENCIDA
            db.add(b)
            updated = True
            
    if updated:
        await db.commit()
        # Re-fetch to get updated states
        result = await db.execute(select(models.ProjectBilling))
        billings = result.scalars().all()
        
    return billings

@router.put("/billings/{billing_id}", response_model=schemas.ProjectBillingResponse)
async def update_project_billing(billing_id: int, billing: schemas.ProjectBillingCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.ProjectBilling).where(models.ProjectBilling.id == billing_id))
    db_billing = result.scalar_one_or_none()
    if not db_billing:
        raise HTTPException(status_code=404, detail="Billing not found")
    
    # Validate dates if status is EMITIDA
    if billing.status == models.BillingStatus.EMITIDA:
        if not billing.date or not billing.issue_date:
            raise HTTPException(status_code=400, detail="Data de Vencimento e Emissão são obrigatórias para status EMITIDA")
            
    # Handle Substitution
    if billing.status == models.BillingStatus.SUBSTITUIDA:
        if not billing.substitution_invoice_number or not billing.substitution_issue_date or not billing.substitution_due_date:
             raise HTTPException(status_code=400, detail="Dados da nova nota (Número, Emissão, Vencimento) são obrigatórios para SUBSTITUIÇÃO")
        
        # Guardar descrição original antes de modificar
        original_description = db_billing.description or ""
        
        # Atualizar descrição da nota antiga com o motivo
        reason = billing.substitution_reason or "Substituída"
        db_billing.description = f"{original_description} ({reason})"
        db_billing.substitution_reason = reason  # Salvar o motivo no campo
        
        # Create new billing - descrição com número da nota anterior
        new_billing = models.ProjectBilling(
            project_id=db_billing.project_id,
            value=db_billing.value, # Assuming same value
            description=f"{original_description} (Subst. {db_billing.invoice_number or 'Antiga'})",
            invoice_number=billing.substitution_invoice_number,
            issue_date=billing.substitution_issue_date,
            date=billing.substitution_due_date,
            status=models.BillingStatus.EMITIDA
        )
        db.add(new_billing)
        await db.flush() # Get ID
        
        # Link old billing to new one
        db_billing.replaced_by_id = new_billing.id
        
    for key, value in billing.model_dump(exclude_unset=True).items():
        if key not in ['substitution_invoice_number', 'substitution_issue_date', 'substitution_due_date', 'substitution_reason', 'description']:
             setattr(db_billing, key, value)
        
    await db.commit()
    await db.refresh(db_billing)
    return db_billing

# Feedbacks
@router.post("/projects/{project_id}/feedback", response_model=schemas.ProjectFeedbackResponse)
async def create_project_feedback(project_id: int, feedback: schemas.ProjectFeedbackCreate, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_active_user)):
    db_feedback = models.ProjectFeedback(
        **feedback.model_dump(),
        project_id=project_id,
        author_id=current_user.id,
        created_at=datetime.now()
    )
    db.add(db_feedback)
    await db.commit()
    await db.refresh(db_feedback)
    
    result = await db.execute(
        select(models.ProjectFeedback)
        .options(selectinload(models.ProjectFeedback.author).selectinload(User.collaborator))
        .where(models.ProjectFeedback.id == db_feedback.id)
    )
    loaded_feedback = result.scalar_one()
    
    author_name = "Usuário"
    if loaded_feedback.author.collaborator:
            author_name = loaded_feedback.author.collaborator.name
    elif loaded_feedback.author.email:
            author_name = loaded_feedback.author.email

    response = schemas.ProjectFeedbackResponse(
        id=loaded_feedback.id,
        project_id=loaded_feedback.project_id,
        author_id=loaded_feedback.author_id,
        message=loaded_feedback.message,
        created_at=loaded_feedback.created_at,
        type=loaded_feedback.type,
        author_name=author_name
    )
    return response

@router.get("/projects/{project_id}/feedback", response_model=List[schemas.ProjectFeedbackResponse])
async def get_project_feedbacks(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.ProjectFeedback)
        .options(
             selectinload(models.ProjectFeedback.author).selectinload(User.collaborator)
        )
        .where(models.ProjectFeedback.project_id == project_id)
        .order_by(models.ProjectFeedback.created_at.desc())
    )
    feedbacks = result.scalars().all()
    
    response = []
    for f in feedbacks:
        author_name = f.author.email
        if f.author.collaborator:
            author_name = f.author.collaborator.name
            
        response.append(schemas.ProjectFeedbackResponse(
            id=f.id,
            project_id=f.project_id,
            author_id=f.author_id,
            message=f.message,
            created_at=f.created_at,
            type=f.type,
            author_name=author_name
        ))
        
    return response

@router.delete("/projects/feedback/{feedback_id}")
async def delete_project_feedback(feedback_id: int, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_active_user)):
    result = await db.execute(select(models.ProjectFeedback).where(models.ProjectFeedback.id == feedback_id))
    feedback = result.scalar_one_or_none()
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
        
    # Optional permission check: Only author or admin can delete
    # if feedback.author_id != current_user.id and not current_user.is_superuser:
    #    raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.delete(feedback)
    await db.commit()
    return {"message": "Feedback deleted successfully"}
