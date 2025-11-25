from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from app.database import Base

class ProjectCollaborator(Base):
    __tablename__ = "project_collaborators"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, nullable=False)
    collaborator_id = Column(Integer, nullable=False)
    role = Column(String, nullable=True)  # Função no projeto
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    status = Column(String, default="active")  # active, inactive

class ProjectTool(Base):
    __tablename__ = "project_tools"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, nullable=False)
    tool_id = Column(Integer, nullable=False)
    quantity = Column(Integer, default=1)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)

class ProjectVehicle(Base):
    __tablename__ = "project_vehicles"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, nullable=False)
    vehicle_id = Column(Integer, nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
