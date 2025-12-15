from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, Date, DateTime, Enum
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
    contract_number = Column(String, nullable=True)
    signature_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    value = Column(Numeric(10, 2), nullable=True) # Valor Global (LPU)
    
    # New Fields
    contract_type = Column(Enum(ContractType), default=ContractType.LPU)
    monthly_value = Column(Numeric(10, 2), nullable=True)
    due_day = Column(Integer, nullable=True)
    readjustment_index = Column(String, nullable=True)

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
    status = Column(String, default="Em Andamento")
    
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
    # feedbacks = relationship defined at end of file

class BillingStatus(str, enum.Enum):
    PREVISTO = "PREVISTO"
    EMITIDA = "EMITIDA"
    PAGO = "PAGO"
    VENCIDA = "VENCIDA"
    CANCELADA = "CANCELADA"
    SUBSTITUIDA = "SUBSTITUIDA"

class ProjectBilling(Base):
    __tablename__ = "project_billings"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    value = Column(Numeric(10, 2))
    date = Column(Date, nullable=True) # Due Date (Vencimento)
    issue_date = Column(Date, nullable=True) # Data de Emissão
    payment_date = Column(Date, nullable=True) # Data de Pagamento
    invoice_number = Column(String, nullable=True)
    description = Column(String, nullable=True)
    status = Column(Enum(BillingStatus), default=BillingStatus.PREVISTO)
    attachment_url = Column(String, nullable=True)
    replaced_by_id = Column(Integer, ForeignKey("project_billings.id"), nullable=True)
    substitution_reason = Column(String, nullable=True)  # Motivo da substituição

    project = relationship("Project", back_populates="billings")
    replaced_by = relationship("ProjectBilling", remote_side=[id])

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
