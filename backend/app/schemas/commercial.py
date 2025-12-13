from pydantic import BaseModel
from typing import Optional
from datetime import date as DateType
from decimal import Decimal

# Client Schemas
class ClientBase(BaseModel):
    name: str
    client_number: Optional[str] = None
    cnpj: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientResponse(ClientBase):
    id: int
    
    class Config:
        from_attributes = True

# Contract Schemas
class ContractBase(BaseModel):
    client_id: int
    description: str
    contract_number: Optional[str] = None
    signature_date: Optional[DateType] = None
    end_date: Optional[DateType] = None
    value: Optional[Decimal] = None
    contract_type: Optional[str] = "LPU"
    monthly_value: Optional[Decimal] = None
    due_day: Optional[int] = None
    readjustment_index: Optional[str] = None

class ContractCreate(ContractBase):
    pass

class ContractResponse(ContractBase):
    id: int
    status: Optional[str] = "Ativo"
    
    class Config:
        from_attributes = True

# Project Billing Schemas
class ProjectBillingBase(BaseModel):
    value: Decimal
    date: Optional[DateType] = None # Due Date
    issue_date: Optional[DateType] = None
    payment_date: Optional[DateType] = None
    invoice_number: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = "PREVISTO"
    attachment_url: Optional[str] = None
    replaced_by_id: Optional[int] = None

class ProjectBillingCreate(ProjectBillingBase):
    # Fields for substitution workflow
    substitution_invoice_number: Optional[str] = None
    substitution_issue_date: Optional[DateType] = None
    substitution_due_date: Optional[DateType] = None
    substitution_reason: Optional[str] = None  # Motivo da substituição

class ProjectBillingResponse(ProjectBillingBase):
    id: int
    project_id: int
    
    class Config:
        from_attributes = True

# Project Schemas
class ProjectBase(BaseModel):
    tag: Optional[str] = None # Auto-generated
    name: str
    scope: Optional[str] = None
    coordinator: Optional[str] = None
    status: Optional[str] = "Em Andamento"
    contract_id: Optional[int] = None
    client_id: int
    team_size: Optional[int] = None
    service_value: Optional[Decimal] = None
    material_value: Optional[Decimal] = None
    budget: Optional[Decimal] = None
    start_date: Optional[DateType] = None
    end_date: Optional[DateType] = None
    estimated_start_date: Optional[DateType] = None
    estimated_end_date: Optional[DateType] = None

class ProjectCreate(ProjectBase):
    project_number: Optional[int] = None

class ProjectResponse(ProjectBase):
    id: int
    project_number: Optional[int] = None
    client_name: Optional[str] = None  # Client name for display
    billings: list[ProjectBillingResponse] = []
    invoiced: Optional[Decimal] = None # Calculated field
    
    class Config:
        from_attributes = True
