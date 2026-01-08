from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from enum import Enum

class ProposalStatus(str, Enum):
    RASCUNHO = "RASCUNHO"
    ENVIADA = "ENVIADA"
    NEGOCIACAO = "NEGOCIACAO"
    GANHA = "GANHA"
    PERDIDA = "PERDIDA"

class ProposalBase(BaseModel):
    title: str
    description: Optional[str] = None
    client_name: Optional[str] = None
    client_id: Optional[int] = None
    value: Optional[Decimal] = None
    labor_value: Optional[Decimal] = None
    material_value: Optional[Decimal] = None
    proposal_type: Optional[str] = None
    company_id: Optional[int] = None
    status: ProposalStatus = ProposalStatus.RASCUNHO
    history: Optional[str] = None

class ProposalCreate(ProposalBase):
    pass

class ProposalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    client_name: Optional[str] = None
    client_id: Optional[int] = None
    value: Optional[Decimal] = None
    labor_value: Optional[Decimal] = None
    material_value: Optional[Decimal] = None
    proposal_type: Optional[str] = None
    company_id: Optional[int] = None
    status: Optional[ProposalStatus] = None
    history: Optional[str] = None

class ProposalResponse(ProposalBase):
    id: int
    internal_id: Optional[str] = None
    converted_project_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ProposalConvertRequest(BaseModel):
    start_date: date
    coordinator: Optional[str] = None
    company_id: Optional[int] = None # To determine TAG prefix
    client_id: Optional[int] = None # If proposal didn't have it set
    estimated_days: Optional[int] = 30
    warranty_months: Optional[int] = 12
    project_scope: Optional[str] = None # If user wants to override proposal description
    budget: Optional[Decimal] = None # If user wants to override proposal value
