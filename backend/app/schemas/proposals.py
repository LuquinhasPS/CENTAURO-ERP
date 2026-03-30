from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from enum import Enum


class ProposalStatus(str, Enum):
    """9 status do funil de vendas em ordem de progressão"""
    LEAD = "LEAD"
    VISITA_TECNICA = "VISITA_TECNICA"
    ELABORACAO = "ELABORACAO"
    APROVACAO_INTERNA = "APROVACAO_INTERNA"
    ENVIADA = "ENVIADA"
    NEGOCIACAO = "NEGOCIACAO"
    STAND_BY = "STAND_BY"
    GANHA = "GANHA"
    PERDIDA = "PERDIDA"


class ProposalBase(BaseModel):
    internal_id: str  # TAG manual (geração automática suspensa)
    title: str
    description: Optional[str] = None
    responsible: Optional[str] = None
    client_name: Optional[str] = None
    client_id: Optional[int] = None
    value: Optional[Decimal] = None
    labor_value: Optional[Decimal] = None
    material_value: Optional[Decimal] = None
    proposal_type: Optional[str] = None
    company_id: Optional[int] = None
    status: ProposalStatus = ProposalStatus.LEAD
    history: Optional[str] = None
    loss_reason: Optional[str] = None
    decision_date: Optional[date] = None


class ProposalCreate(ProposalBase):
    pass


class ProposalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    responsible: Optional[str] = None
    client_name: Optional[str] = None
    client_id: Optional[int] = None
    value: Optional[Decimal] = None
    labor_value: Optional[Decimal] = None
    material_value: Optional[Decimal] = None
    proposal_type: Optional[str] = None
    company_id: Optional[int] = None
    status: Optional[ProposalStatus] = None
    history: Optional[str] = None
    loss_reason: Optional[str] = None


class ProposalResponse(ProposalBase):
    id: int
    internal_id: str  # TAG manual (geração automática suspensa)
    converted_project_id: Optional[int] = None
    loss_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    decision_date: Optional[date] = None

    class Config:
        from_attributes = True


class ProposalConvertRequest(BaseModel):
    tag: str  # TAG manual (geração automática suspensa)
    start_date: date
    coordinator: Optional[str] = None
    company_id: Optional[int] = None  # To determine TAG prefix
    client_id: Optional[int] = None  # If proposal didn't have it set
    estimated_days: Optional[int] = 30
    warranty_months: Optional[int] = 12
    project_scope: Optional[str] = None  # If user wants to override proposal description
    budget: Optional[Decimal] = None  # If user wants to override proposal value
    directory_url: Optional[str] = None


# --- Schemas para Tarefas de Follow-up ---

class ProposalTaskBase(BaseModel):
    title: str
    due_date: datetime
    recurrence_days: Optional[int] = None  # Se preenchido, tarefa é recorrente


class ProposalTaskCreate(ProposalTaskBase):
    pass


class ProposalTaskUpdate(BaseModel):
    title: Optional[str] = None
    due_date: Optional[datetime] = None
    recurrence_days: Optional[int] = None
    is_active: Optional[bool] = None
    is_completed: Optional[bool] = None


class ProposalTaskResponse(ProposalTaskBase):
    id: int
    proposal_id: int
    is_active: bool
    is_completed: bool
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
