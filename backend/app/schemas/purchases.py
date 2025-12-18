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
    status: str = "pending"
    expected_date: Optional[date] = None
    notes: Optional[str] = None

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
    created_at: datetime
    items: list[PurchaseItemResponse] = []
    
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

