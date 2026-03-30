from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from enum import Enum

class PurchaseItemBase(BaseModel):
    description: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    quantity: int = 1
    unit: str = "un"
    unit_price: float = 0.0
    total_price: float = 0.0
    supplier: Optional[str] = None
    payment_method: Optional[str] = None
    installment_count: int = 1
    status: str = "pending"
    expected_date: Optional[date] = None
    notes: Optional[str] = None
    quantity_withdrawn: int = 0
    link_original: Optional[str] = None
    link_compras: Optional[str] = None

class PurchaseItemCreate(PurchaseItemBase):
    pass

class PurchaseItemResponse(PurchaseItemBase):
    id: int
    request_id: int

    class Config:
        from_attributes = True

class PurchaseRequestBase(BaseModel):
    project_id: Optional[int] = None
    description: str
    requester: Optional[str] = None
    shipping_cost: Optional[float] = 0.0
    status: str = "pending"
    
    # Service Fields
    category: str = "MATERIAL"
    service_start_date: Optional[date] = None
    service_end_date: Optional[date] = None
    is_indefinite_term: bool = False
    
    # Material Fields
    arrival_forecast: Optional[date] = None
    notes: Optional[str] = None
    directory_url: Optional[str] = None
    
class PurchaseRequestCreate(PurchaseRequestBase):
    items: Optional[list[PurchaseItemCreate]] = []

# Approver info for response
class ApproverInfo(BaseModel):
    id: int
    name: Optional[str] = None
    
    class Config:
        from_attributes = True

class PurchaseRequestResponse(PurchaseRequestBase):
    id: int
    project_tag: Optional[str] = None
    project_name: Optional[str] = None
    project_directory_url: Optional[str] = None
    client_name: Optional[str] = None
    created_at: datetime
    items: list[PurchaseItemResponse] = []
    observations: list['PurchaseObservationResponse'] = []
    
    # Technical Approval
    tech_approval_at: Optional[datetime] = None
    tech_approver_id: Optional[int] = None
    tech_approver_name: Optional[str] = None
    
    # Project Control Approval
    control_approval_at: Optional[datetime] = None
    control_approver_id: Optional[int] = None
    control_approver_name: Optional[str] = None
    
    # Finance Approval
    finance_approval_at: Optional[datetime] = None
    finance_approver_id: Optional[int] = None
    finance_approver_name: Optional[str] = None
    
    # Rejection
    rejection_reason: Optional[str] = None
    rejected_by_id: Optional[int] = None
    rejected_by_name: Optional[str] = None
    rejected_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Approval workflow schemas
class ApprovalType(str, Enum):
    TECH = "TECH"
    CONTROL = "CONTROL"
    FINANCE = "FINANCE"

class ApprovalRequest(BaseModel):
    approval_type: ApprovalType

class RejectionRequest(BaseModel):
    reason: str

# ================================
# WITHDRAWAL SCHEMAS
# ================================

class WithdrawalItemRequest(BaseModel):
    item_id: int
    quantity: int

class WithdrawalRequest(BaseModel):
    observation: Optional[str] = None
    items: list[WithdrawalItemRequest]

class WithdrawalItemResponse(BaseModel):
    id: int
    item_id: int
    item_description: Optional[str] = None
    quantity_withdrawn: int

    class Config:
        from_attributes = True

class WithdrawalResponse(BaseModel):
    id: int
    purchase_id: int
    user_name: Optional[str] = None
    observation: Optional[str] = None
    created_at: datetime
    items: list[WithdrawalItemResponse] = []

    class Config:
        from_attributes = True

class PurchaseObservationBase(BaseModel):
    message: str

class PurchaseObservationCreate(PurchaseObservationBase):
    pass

class PurchaseObservationResponse(PurchaseObservationBase):
    id: int
    purchase_id: int
    user_id: int
    user_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ================================
# FINANCIAL SUMMARY SCHEMA
# ================================

class PurchaseFinancialSummary(BaseModel):
    orcamento_previsto_material: float
    saldo_atual_disponivel: float
    valor_desta_solicitacao: float
    saldo_restante_previsto: float
