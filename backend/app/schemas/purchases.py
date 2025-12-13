from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

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
    status: str = "pending"

class PurchaseRequestCreate(PurchaseRequestBase):
    items: Optional[list[PurchaseItemCreate]] = []

class PurchaseRequestResponse(PurchaseRequestBase):
    id: int
    created_at: datetime
    items: list[PurchaseItemResponse] = []

    class Config:
        from_attributes = True
