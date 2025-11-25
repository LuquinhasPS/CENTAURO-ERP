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
    tag = Column(String, unique=True, index=True)
    name = Column(String)
    scope = Column(String)
    coordinator = Column(String)
    
    # Financials
    service_value = Column(Numeric(10, 2))
    material_value = Column(Numeric(10, 2))
    budget = Column(Numeric(10, 2))
    invoiced = Column(Numeric(10, 2))
    
    # Dates
    start_date = Column(Date)
    end_date = Column(Date)
    estimated_date = Column(Date)

    contract = relationship("Contract", back_populates="projects")
