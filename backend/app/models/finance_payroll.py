from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, Numeric
from sqlalchemy.orm import relationship
from app.database import Base

class MonthlyLaborCost(Base):
    __tablename__ = "monthly_labor_costs"

    id = Column(Integer, primary_key=True, index=True)
    collaborator_id = Column(Integer, ForeignKey("collaborators.id"), nullable=False)
    competence_date = Column(Date, nullable=False)  # First day of the month (YYYY-MM-01)
    
    total_cost = Column(Numeric(10, 2), nullable=False)  # Read from Excel
    
    total_days_found = Column(Integer, default=0)  # Days allocated in Scheduler for this month
    calculated_daily_rate = Column(Numeric(10, 2), default=0) # total_cost / total_days_found (if > 0)
    
    unallocated_cost = Column(Numeric(10, 2), default=0) # Cost not distributed to projects
    
    collaborator = relationship("app.models.operational.Collaborator")
    project_costs = relationship("ProjectLaborCost", back_populates="monthly_cost", cascade="all, delete-orphan")

class ProjectLaborCost(Base):
    __tablename__ = "project_labor_costs"

    id = Column(Integer, primary_key=True, index=True)
    monthly_cost_id = Column(Integer, ForeignKey("monthly_labor_costs.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    
    days_worked = Column(Integer, nullable=False)
    cost_value = Column(Numeric(10, 2), nullable=False) # calculated_daily_rate * days_worked
    
    monthly_cost = relationship("MonthlyLaborCost", back_populates="project_costs")
    project = relationship("app.models.commercial.Project")
