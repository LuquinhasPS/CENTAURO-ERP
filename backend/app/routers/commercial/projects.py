"""
Projects Router - CRUD operations for Projects and Project Feedbacks
Extracted from commercial.py during modularization
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import date, datetime
from typing import List

from app.database import get_db
from app.models import commercial as models
from app.models.users import User
from app.models.finance import BillingStatus, ProjectBilling
from app.schemas import commercial as schemas
from app.auth import get_current_active_user
from app.services.commercial.project_service import ProjectService
from app.utils.messages import Msg

router = APIRouter()


# ========== PROJECTS CRUD ==========

@router.get("/projects", response_model=List[schemas.ProjectResponse])
async def get_projects(db: AsyncSession = Depends(get_db)):
    # Check for expired projects and update status
    today = date.today()
    
    # Find active projects that have expired
    result = await db.execute(
        select(models.Project).where(
            models.Project.end_date < today,
            models.Project.status != "Concluído",
            models.Project.status != "Cancelado",
            models.Project.status != "Pausado"
        )
    )
    expired_projects = result.scalars().all()
    
    if expired_projects:
        for project in expired_projects:
            project.status = "Concluído"
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
        invoiced = sum(b.value for b in p.billings if b.status == BillingStatus.PAGO) if p.billings else 0
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
            "warranty_months": p.warranty_months,
            "status": p.status,
            "company_id": p.company_id,
            "estimated_days": p.estimated_days,
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
        raise HTTPException(status_code=404, detail=Msg.CLIENT_NOT_FOUND)
    
    # ============================================================
    # [SUSPENSA] Geração automática de TAG suspensa até fim do ano.
    # O bloco abaixo foi comentado. A TAG agora vem do payload.
    # Para reverter, descomente o bloco e remova o bloco manual.
    # ============================================================
    # # 2. Determine Project Number and TAG (AUTOMÁTICO — COMENTADO)
    # try:
    #     tag, next_number, _ = await ProjectService.generate_tag(project, db)
    # except ValueError as e:
    #     raise HTTPException(status_code=400, detail=str(e))

    # 2. TAG manual — normalizar e validar unicidade
    tag = project.tag.strip().upper()
    
    # Verificar se a TAG já existe em Projetos
    existing_project = await db.execute(
        select(models.Project).where(models.Project.tag == tag)
    )
    if existing_project.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=Msg.TAG_ALREADY_EXISTS)
    
    # Verificar se a TAG já existe em Contratos
    existing_contract = await db.execute(
        select(models.Contract).where(models.Contract.contract_number == tag)
    )
    if existing_contract.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=Msg.TAG_ALREADY_EXISTS)
        
    # Verificar se a TAG já existe em Propostas
    from app.models.proposals import CommercialProposal
    existing_prop = await db.execute(
        select(CommercialProposal).where(CommercialProposal.internal_id == tag)
    )
    if existing_prop.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Esta TAG já está em uso em uma Proposta.")
    
    # Create DB object
    db_project = models.Project(**project.model_dump(exclude={"tag"}))
    db_project.tag = tag
    # db_project.project_number = next_number  # [SUSPENSA] Numeração automática
    
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
        "warranty_months": db_project.warranty_months,
        "status": db_project.status,
        "company_id": db_project.company_id,
        "estimated_days": db_project.estimated_days,
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
        raise HTTPException(status_code=404, detail=Msg.PROJECT_NOT_FOUND)
    
    # Apply Overdue Logic for Billings
    today = date.today()
    updated = False
    if project.billings:
        for b in project.billings:
            if b.status == BillingStatus.EMITIDA and b.date and b.date < today:
                b.status = BillingStatus.VENCIDA
                db.add(b)
                updated = True
    
    if updated:
        await db.commit()
        # No need to re-fetch as we modified the objects in session
    
    # Calculate invoiced
    project.invoiced = sum(b.value for b in project.billings if b.status == BillingStatus.PAGO) if project.billings else 0

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
        raise HTTPException(status_code=404, detail=Msg.PROJECT_NOT_FOUND)
    
    for key, value in project.model_dump().items():
        setattr(db_project, key, value)
    
    await db.commit()
    await db.refresh(db_project)
    
    # Convert to dict to avoid Pydantic triggering lazy loads on the ORM object
    # Fetch billings to calculate invoiced
    result_billings = await db.execute(select(ProjectBilling).where(ProjectBilling.project_id == project_id))
    billings = result_billings.scalars().all()
    invoiced = sum(b.value for b in billings if b.status == BillingStatus.PAGO) if billings else 0
    
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
        "warranty_months": db_project.warranty_months,
        "status": db_project.status,
        "company_id": db_project.company_id,
        "estimated_days": db_project.estimated_days,
        "billings": [{"id": b.id, "value": b.value, "date": b.date, "invoice_number": getattr(b, 'invoice_number', None), "description": b.description, "project_id": b.project_id} for b in billings],
        "invoiced": invoiced
    }
    
    return project_dict


@router.delete("/projects/{project_id}")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Project).where(models.Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail=Msg.PROJECT_NOT_FOUND)
    await db.delete(project)
    await db.commit()
    return {"message": Msg.PROJECT_DELETED}


# ========== PROJECT FEEDBACKS ==========

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
