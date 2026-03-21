"""
Commercial Models
Contains Client, Contract, Project, and ProjectFeedback entities
ProjectBilling moved to models/finance.py for domain separation
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, Date, DateTime, Enum, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class ContractType(str, enum.Enum):
    LPU = "LPU"
    RECORRENTE = "RECORRENTE"


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    client_number = Column(String, unique=True, index=True, nullable=True)  # Número interno do cliente (01, 02, 03...)
    name = Column(String, index=True)
    cnpj = Column(String, unique=True, nullable=True)
    contact_person = Column(String, nullable=True)  # Legacy - will be migrated to contacts
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)

    contracts = relationship("Contract", back_populates="client")
    projects = relationship("Project", back_populates="client")
    contacts = relationship("ClientContact", back_populates="client", cascade="all, delete-orphan")


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    title = Column(String, nullable=True)
    description = Column(String, nullable=True)
    contract_number = Column(String, nullable=True)
    signature_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    value = Column(Numeric(10, 2), nullable=True)  # Valor Global (LPU)
    
    # New Fields
    contract_type = Column(Enum(ContractType), default=ContractType.LPU)
    monthly_value = Column(Numeric(10, 2), nullable=True)
    due_day = Column(Integer, nullable=True)
    readjustment_index = Column(String, nullable=True)
    company_id = Column(Integer, nullable=True)  # 1=Engenharia, 2=Telecom, etc.

    client = relationship("Client", back_populates="contracts")
    projects = relationship("Project", back_populates="contract")
    tickets = relationship("Ticket", back_populates="contract")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    tag = Column(String, unique=True, index=True)
    project_number = Column(Integer)  # Sequential number for the tag
    name = Column(String)
    scope = Column(String)  # Text
    coordinator = Column(String)
    team_size = Column(Integer, nullable=True)
    status = Column(String, default="Aprovado")
    
    # Financials
    service_value = Column(Numeric(10, 2))
    material_value = Column(Numeric(10, 2))
    budget = Column(Numeric(10, 2))  # Total Value (Service + Material)
    
    # Dates
    start_date = Column(Date)
    end_date = Column(Date)
    estimated_start_date = Column(Date)
    estimated_end_date = Column(Date)
    
    # New Fields for Info Tab Refinement
    company_id = Column(Integer, nullable=True)  # 1=Centauro, 2=Other, etc.
    estimated_days = Column(Integer, nullable=True)  # Commercial estimation
    
    # Warranty
    warranty_months = Column(Integer, nullable=True)  # Warranty period in months from end_date

    # Relationships
    contract = relationship("Contract", back_populates="projects")
    client = relationship("Client", back_populates="projects")
    # String reference to avoid circular import with finance.py
    billings = relationship("ProjectBilling", back_populates="project", cascade="all, delete-orphan")


class FeedbackType(str, enum.Enum):
    INFO = "INFO"
    ALERTA = "ALERTA"
    BLOQUEIO = "BLOQUEIO"


class ProjectFeedback(Base):
    __tablename__ = "project_feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    type = Column(Enum(FeedbackType), default=FeedbackType.INFO)

    project = relationship("Project", back_populates="feedbacks")
    author = relationship("app.models.users.User")


# Update Project to include feedbacks relationship
Project.feedbacks = relationship("ProjectFeedback", back_populates="project", order_by="desc(ProjectFeedback.created_at)", cascade="all, delete-orphan")
