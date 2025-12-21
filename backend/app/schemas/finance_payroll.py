from pydantic import BaseModel
from typing import List, Optional
from datetime import date
from decimal import Decimal

# Shared Models
class ProjectLaborCostBase(BaseModel):
    project_id: int
    project_name: Optional[str] = None
    days_worked: int
    cost_value: Decimal

    class Config:
        from_attributes = True

class MonthlyLaborCostBase(BaseModel):
    collaborator_id: int
    collaborator_name: Optional[str] = None
    registration_number: Optional[str] = None
    competence_date: date
    total_cost: Decimal
    total_days_found: int
    calculated_daily_rate: Decimal
    unallocated_cost: Decimal

    class Config:
        from_attributes = True

# Response Models
class ProjectLaborCostResponse(ProjectLaborCostBase):
    id: int

class MonthlyLaborCostResponse(MonthlyLaborCostBase):
    id: int
    project_costs: List[ProjectLaborCostResponse] = []

class PayrollUploadSummary(BaseModel):
    total_processed: int
    total_allocated_cost: Decimal
    total_unallocated_cost: Decimal
    details: List[MonthlyLaborCostResponse]
