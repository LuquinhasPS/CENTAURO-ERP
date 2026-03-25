from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, Enum, Text, DateTime, Boolean, Date, func
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class ProposalStatus(str, enum.Enum):
    """9 status do funil de vendas em ordem de progressão"""
    LEAD = "LEAD"
    VISITA_TECNICA = "VISITA_TECNICA"
    ELABORACAO = "ELABORACAO"
    APROVACAO_INTERNA = "APROVACAO_INTERNA"
    ENVIADA = "ENVIADA"
    NEGOCIACAO = "NEGOCIACAO"
    STAND_BY = "STAND_BY"
    GANHA = "GANHA"
    PERDIDA = "PERDIDA"


class CommercialProposal(Base):
    __tablename__ = "commercial_proposals"

    id = Column(Integer, primary_key=True, index=True)
    internal_id = Column(String, index=True, nullable=True)  # e.g. "PROP-001"
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    responsible = Column(String, nullable=True) # Nome do responsável
    
    client_name = Column(String, nullable=True)  # For prospects
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)  # For existing clients

    value = Column(Numeric(10, 2), nullable=True)
    labor_value = Column(Numeric(10, 2), nullable=True)
    material_value = Column(Numeric(10, 2), nullable=True)
    status = Column(Enum(ProposalStatus), default=ProposalStatus.LEAD)

    proposal_type = Column(String, nullable=True)  # "RECORRENTE", "LPU", "AVULSA"
    company_id = Column(Integer, nullable=True)  # 1, 2, 3, 4 (CNPJ ID)
    
    history = Column(Text, nullable=True)  # JSON string or simple text log
    
    # Campo de perda - obrigatório quando status = PERDIDA
    loss_reason = Column(String, nullable=True)
    
    converted_project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    converted_contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now())
    decision_date = Column(Date, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    client = relationship("app.models.commercial.Client", backref="proposals")
    project = relationship("app.models.commercial.Project", foreign_keys=[converted_project_id])
    contract = relationship("app.models.commercial.Contract", foreign_keys=[converted_contract_id])
    tasks = relationship("ProposalTask", back_populates="proposal", cascade="all, delete-orphan")


class ProposalTask(Base):
    """Tarefas de follow-up com suporte a recorrência"""
    __tablename__ = "proposal_tasks"

    id = Column(Integer, primary_key=True, index=True)
    proposal_id = Column(Integer, ForeignKey("commercial_proposals.id"), nullable=False)
    
    title = Column(String, nullable=False)  # Ex: "Cobrar retorno", "Ligar para cliente"
    due_date = Column(DateTime, nullable=False)  # Primeira data de execução
    
    # Recorrência: se preenchido, indica que o alerta se repete a cada X dias
    recurrence_days = Column(Integer, nullable=True)
    
    # Controle de estado
    is_active = Column(Boolean, default=True)  # False = parou a recorrência
    is_completed = Column(Boolean, default=False)  # True = tarefa concluída
    
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    proposal = relationship("CommercialProposal", back_populates="tasks")
