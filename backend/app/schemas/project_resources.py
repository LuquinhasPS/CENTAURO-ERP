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
    pass

class ProjectCollaboratorResponse(ProjectCollaboratorBase):
    id: int

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
    pass

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
    pass

class ProjectVehicleResponse(ProjectVehicleBase):
    id: int

    class Config:
        from_attributes = True
