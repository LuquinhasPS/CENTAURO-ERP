from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date
from datetime import date as DateType
from decimal import Decimal

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

class ProjectBillingResponse(ProjectBillingBase):
    id: int
    project_id: int
    
    model_config = ConfigDict(from_attributes=True)

# Test with dict
data = {
    "id": 1,
    "project_id": 1,
    "value": Decimal("100.00"),
    "date": date(2025, 11, 17),
    "status": "PREVISTO"
}

try:
    obj = ProjectBillingResponse.model_validate(data)
    print("Validation Successful with Dict!")
except Exception as e:
    print(f"Validation Error with Dict: {e}")

# Test with object
class MockBilling:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

mock_obj = MockBilling(**data)
try:
    obj = ProjectBillingResponse.model_validate(mock_obj)
    print("Validation Successful with Object!")
except Exception as e:
    print(f"Validation Error with Object: {e}")
