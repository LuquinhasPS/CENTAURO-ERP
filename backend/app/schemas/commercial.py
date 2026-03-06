from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import date as DateType, datetime
from decimal import Decimal
from app.schemas.finance import ProjectBillingResponse



# Client Contact Schemas
class ClientContactBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    department: str = "Geral"

class ClientContactCreate(ClientContactBase):
    pass

class ClientContactResponse(ClientContactBase):
    id: int
    client_id: int
    
    class Config:
        from_attributes = True


# Client Schemas
class ClientBase(BaseModel):
    name: str
    client_number: Optional[str] = None
    cnpj: Optional[str] = None
    contact_person: Optional[str] = None  # Legacy field
    address: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientResponse(ClientBase):
    id: int
    total_faturado: Optional[Decimal] = 0.0
    contacts: List[ClientContactResponse] = []
    
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
    company_id: Optional[int] = None

class ContractCreate(ContractBase):
    pass

class ContractResponse(ContractBase):
    id: int
    status: Optional[str] = "Ativo"
    
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
    company_id: Optional[int] = None
    estimated_days: Optional[int] = None
    warranty_months: Optional[int] = None  # Warranty period in months from end_date

class ProjectCreate(ProjectBase):
    project_number: Optional[int] = None

class ProjectResponse(ProjectBase):
    id: int
    project_number: Optional[int] = None
    client_name: Optional[str] = None  # Client name for display
    billings: list[ProjectBillingResponse] = []
    invoiced: Optional[Decimal] = None # Calculated field
    total_labor_cost: Optional[Decimal] = 0.0 # Calculated field
    warranty_end_date: Optional[DateType] = None  # Calculated: end_date + warranty_months
    
    class Config:
        from_attributes = True

# Project Feedback Schemas
class ProjectFeedbackBase(BaseModel):
    message: str
    type: Optional[str] = "INFO"

class ProjectFeedbackCreate(ProjectFeedbackBase):
    pass

class ProjectFeedbackResponse(ProjectFeedbackBase):
    id: int
    project_id: int
    author_id: int
    created_at: datetime
    author_name: Optional[str] = None # Resolved

    class Config:
        from_attributes = True
