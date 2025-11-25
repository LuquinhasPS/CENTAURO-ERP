from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class PurchaseRequestBase(BaseModel):
    project_id: Optional[int] = None
    description: str
    quantity: int = 1
    unit_price: float = 0.0
    total_price: float = 0.0
    supplier: Optional[str] = None
    status: str = "pending"
    expected_date: Optional[date] = None
    requester: Optional[str] = None
    notes: Optional[str] = None

class PurchaseRequestCreate(PurchaseRequestBase):
    pass

class PurchaseRequestResponse(PurchaseRequestBase):
    id: int
    requested_date: datetime

    class Config:
        from_attributes = True
