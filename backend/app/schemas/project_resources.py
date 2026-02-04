from pydantic import BaseModel
from typing import Optional
from datetime import date

# Project Collaborator Schemas
class ProjectCollaboratorBase(BaseModel):
    project_id: int
    collaborator_id: int
    role: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: str = "active"

class ProjectCollaboratorCreate(ProjectCollaboratorBase):
    include_weekends: bool = False

class AllocationPeriod(BaseModel):
    start: date
    end: date
    days: int

class ProjectCollaboratorResponse(ProjectCollaboratorBase):
    id: int
    # Dynamic fields from Allocations
    real_start_date: Optional[date] = None
    real_end_date: Optional[date] = None
    days_count: Optional[int] = 0
    periods: Optional[list[AllocationPeriod]] = []

    class Config:
        from_attributes = True

# Project Tool Schemas
class ProjectToolBase(BaseModel):
    project_id: int
    tool_id: int
    quantity: int = 1
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class ProjectToolCreate(ProjectToolBase):
    include_weekends: bool = False

class ProjectToolResponse(ProjectToolBase):
    id: int

    class Config:
        from_attributes = True

# Project Vehicle Schemas
class ProjectVehicleBase(BaseModel):
    project_id: int
    vehicle_id: int
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class ProjectVehicleCreate(ProjectVehicleBase):
    include_weekends: bool = False

class ProjectVehicleResponse(ProjectVehicleBase):
    id: int

    class Config:
        from_attributes = True
