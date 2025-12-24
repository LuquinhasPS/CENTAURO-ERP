from pydantic import BaseModel
from typing import Optional, List
from datetime import date as DateType, datetime
from decimal import Decimal


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
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientResponse(ClientBase):
    id: int
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

class ContractCreate(ContractBase):
    pass

class ContractResponse(ContractBase):
    id: int
    status: Optional[str] = "Ativo"
    
    class Config:
        from_attributes = True

# Project Billing Schemas
class ProjectBillingBase(BaseModel):
    value: Decimal # This will now be treated as Gross Value in simple view, or legacy support
    date: Optional[DateType] = None # Due Date
    issue_date: Optional[DateType] = None
    payment_date: Optional[DateType] = None
    invoice_number: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = "PREVISTO"
    attachment_url: Optional[str] = None
    replaced_by_id: Optional[int] = None

    # New Fields
    category: Optional[str] = "SERVICE"
    gross_value: Optional[Decimal] = 0
    net_value: Optional[Decimal] = 0
    taxes_verified: Optional[bool] = False

    retention_iss: Optional[Decimal] = 0
    retention_inss: Optional[Decimal] = 0
    retention_irrf: Optional[Decimal] = 0
    retention_pis: Optional[Decimal] = 0
    retention_cofins: Optional[Decimal] = 0
    retention_csll: Optional[Decimal] = 0

    # Non-retained taxes (Service)
    tax_iss: Optional[Decimal] = 0
    tax_pis: Optional[Decimal] = 0
    tax_cofins: Optional[Decimal] = 0
    tax_irpj: Optional[Decimal] = 0

    # Taxes (Material)
    tax_icms: Optional[Decimal] = 0
    tax_ipi: Optional[Decimal] = 0
    value_st: Optional[Decimal] = 0

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
