from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, Numeric,  Enum, Text, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class ProposalStatus(str, enum.Enum):
    RASCUNHO = "RASCUNHO"
    ENVIADA = "ENVIADA"
    NEGOCIACAO = "NEGOCIACAO"
    GANHA = "GANHA"
    PERDIDA = "PERDIDA"

class CommercialProposal(Base):
    __tablename__ = "commercial_proposals"

    id = Column(Integer, primary_key=True, index=True)
    internal_id = Column(String, index=True, nullable=True) # e.g. "PROP-001"
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    
    client_name = Column(String, nullable=True) # For prospects
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True) # For existing clients

    value = Column(Numeric(10, 2), nullable=True)
    labor_value = Column(Numeric(10, 2), nullable=True)
    material_value = Column(Numeric(10, 2), nullable=True)
    status = Column(Enum(ProposalStatus), default=ProposalStatus.RASCUNHO)

    proposal_type = Column(String, nullable=True) # "RECORRENTE", "LPU", "AVULSA"
    company_id = Column(Integer, nullable=True) # 1, 2, 3, 4 (CNPJ ID)
    
    history = Column(Text, nullable=True) # JSON string or simple text log
    
    converted_project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    client = relationship("app.models.commercial.Client", backref="proposals")
    project = relationship("app.models.commercial.Project", foreign_keys=[converted_project_id])
