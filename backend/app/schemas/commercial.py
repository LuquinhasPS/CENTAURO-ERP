from pydantic import BaseModel
from typing import Optional
from datetime import date
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

class ContractCreate(ContractBase):
    pass

class ContractResponse(ContractBase):
    id: int
    
    class Config:
        from_attributes = True

# Project Billing Schemas
class ProjectBillingBase(BaseModel):
    value: Decimal
    date: date
    invoice_number: Optional[str] = None
    description: Optional[str] = None

class ProjectBillingCreate(ProjectBillingBase):
    pass

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
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    estimated_start_date: Optional[date] = None
    estimated_end_date: Optional[date] = None

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
