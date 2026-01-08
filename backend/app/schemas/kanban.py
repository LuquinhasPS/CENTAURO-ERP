from pydantic import BaseModel
from typing import Optional

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "todo"
    priority: str = "medium"
    assignee: Optional[str] = None
    project_id: Optional[int] = None
    collaborator_id: Optional[int] = None


class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee: Optional[str] = None
    project_id: Optional[int] = None
    collaborator_id: Optional[int] = None

class TaskResponse(TaskBase):
    id: int

    class Config:
        from_attributes = True
