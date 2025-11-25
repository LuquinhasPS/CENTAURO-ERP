from sqlalchemy import Column, Integer, String, Enum
from app.database import Base
import enum

class TaskStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in-progress"
    DONE = "done"

class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    status = Column(String, default="todo")
    priority = Column(String, default="medium")
    assignee = Column(String, nullable=True) # Mantendo para compatibilidade, mas preferir collaborator_id
    project_id = Column(Integer, nullable=True)
    collaborator_id = Column(Integer, nullable=True)

