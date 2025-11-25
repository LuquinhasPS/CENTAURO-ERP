from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, Date
from sqlalchemy.orm import relationship
from app.database import Base

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    client_number = Column(String, unique=True, index=True, nullable=True)  # Número interno do cliente (01, 02, 03...)
    name = Column(String, index=True)
    cnpj = Column(String, unique=True, nullable=True)
    contact_person = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)

    contracts = relationship("Contract", back_populates="client")
    projects = relationship("Project", back_populates="client")


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    description = Column(String)

    client = relationship("Client", back_populates="contracts")
    projects = relationship("Project", back_populates="contract")
    tickets = relationship("Ticket", back_populates="contract")

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    tag = Column(String, unique=True, index=True)
    project_number = Column(Integer) # Sequential number for the tag
    name = Column(String)
    scope = Column(String) # Text
    coordinator = Column(String)
    team_size = Column(Integer, nullable=True)
    
    # Financials
    service_value = Column(Numeric(10, 2))
    material_value = Column(Numeric(10, 2))
    budget = Column(Numeric(10, 2)) # Total Value (Service + Material)
    # invoiced removed, calculated from billings
    
    # Dates
    start_date = Column(Date)
    end_date = Column(Date)
    estimated_start_date = Column(Date)
    estimated_end_date = Column(Date)

    contract = relationship("Contract", back_populates="projects")
    client = relationship("Client", back_populates="projects")
    billings = relationship("ProjectBilling", back_populates="project", cascade="all, delete-orphan")

class ProjectBilling(Base):
    __tablename__ = "project_billings"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    value = Column(Numeric(10, 2))
    date = Column(Date)
    invoice_number = Column(String, nullable=True)
    description = Column(String, nullable=True)

    project = relationship("Project", back_populates="billings")
