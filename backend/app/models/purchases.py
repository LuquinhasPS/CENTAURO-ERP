from app.utils.timezone import now_brazil
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class PurchaseRequest(Base):
    __tablename__ = "purchase_requests"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    description = Column(String, nullable=False) # Nome do pacote/solicitação
    requester = Column(String, nullable=True)
    status = Column(String, default="pending") # pending, approved, rejected, ordered, received
    shipping_cost = Column(Float, default=0.0)
    
    # Service / Rental Fields
    category = Column(String, default="MATERIAL") # MATERIAL, SERVICE
    service_start_date = Column(Date, nullable=True)
    service_end_date = Column(Date, nullable=True)
    is_indefinite_term = Column(Boolean, default=False)
    
    # Material Fields
    arrival_forecast = Column(Date, nullable=True) # Data prevista para chegada do material
    notes = Column(String, nullable=True) # Observações gerais do pedido

    created_at = Column(DateTime, default=now_brazil)
    
    # Technical Approval (Engineering)
    tech_approval_at = Column(DateTime, nullable=True)
    tech_approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Project Control Approval (Budget)
    control_approval_at = Column(DateTime, nullable=True)
    control_approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Finance Approval (Payment)
    finance_approval_at = Column(DateTime, nullable=True)
    finance_approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Rejection
    rejection_reason = Column(String, nullable=True)
    rejected_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    
    # Relationships
    items = relationship("PurchaseItem", back_populates="request", cascade="all, delete-orphan")
    observations = relationship("PurchaseObservation", back_populates="purchase", cascade="all, delete-orphan")
    tech_approver = relationship("app.models.users.User", foreign_keys=[tech_approver_id])
    control_approver = relationship("app.models.users.User", foreign_keys=[control_approver_id])
    finance_approver = relationship("app.models.users.User", foreign_keys=[finance_approver_id])
    rejected_by = relationship("app.models.users.User", foreign_keys=[rejected_by_id])
    project = relationship("app.models.commercial.Project")

class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("purchase_requests.id"))
    description = Column(String, nullable=False) # Material/Item
    manufacturer = Column(String, nullable=True)
    model = Column(String, nullable=True)
    quantity = Column(Integer, default=1)
    unit = Column(String, default="un")
    unit_price = Column(Float, default=0.0)
    total_price = Column(Float, default=0.0)
    supplier = Column(String, nullable=True)  # Fornecedor
    payment_method = Column(String, nullable=True)  # Forma de pagamento
    installment_count = Column(Integer, default=1)  # Quantidade de parcelas
    status = Column(String, default="pending") # Status individual do item
    expected_date = Column(Date, nullable=True)  # Prazo de entrega
    notes = Column(String, nullable=True)
    quantity_withdrawn = Column(Integer, default=0)  # Acumulador de retiradas
    link_original = Column(String, nullable=True) # Sugestão da engenharia
    link_compras = Column(String, nullable=True) # Link definido por suprimentos

    request = relationship("PurchaseRequest", back_populates="items")


class PurchaseWithdrawal(Base):
    """Log de retirada de materiais de um pedido de compra."""
    __tablename__ = "purchase_withdrawals"

    id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(Integer, ForeignKey("purchase_requests.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    observation = Column(String, nullable=True)
    created_at = Column(DateTime, default=now_brazil)

    # Relationships
    purchase = relationship("PurchaseRequest")
    user = relationship("app.models.users.User")
    items = relationship("PurchaseWithdrawalItem", back_populates="withdrawal", cascade="all, delete-orphan")


class PurchaseWithdrawalItem(Base):
    """Itens individuais retirados em uma retirada."""
    __tablename__ = "purchase_withdrawal_items"

    id = Column(Integer, primary_key=True, index=True)
    withdrawal_id = Column(Integer, ForeignKey("purchase_withdrawals.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("purchase_items.id"), nullable=False)
    quantity_withdrawn = Column(Integer, nullable=False)

    # Relationships
    withdrawal = relationship("PurchaseWithdrawal", back_populates="items")
    item = relationship("PurchaseItem")


class PurchaseObservation(Base):
    __tablename__ = "purchase_observations"

    id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(Integer, ForeignKey("purchase_requests.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(String, nullable=False)
    created_at = Column(DateTime, default=now_brazil)

    # Relationships
    purchase = relationship("PurchaseRequest", back_populates="observations")
    user = relationship("app.models.users.User")

