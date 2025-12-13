from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class PurchaseRequest(Base):
    __tablename__ = "purchase_requests"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, nullable=True)
    description = Column(String, nullable=False) # Nome do pacote/solicitação
    requester = Column(String, nullable=True)
    status = Column(String, default="pending") # pending, approved, rejected, ordered, received
    created_at = Column(DateTime, default=datetime.utcnow)
    
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
    tech_approver = relationship("app.models.users.User", foreign_keys=[tech_approver_id])
    control_approver = relationship("app.models.users.User", foreign_keys=[control_approver_id])
    finance_approver = relationship("app.models.users.User", foreign_keys=[finance_approver_id])
    rejected_by = relationship("app.models.users.User", foreign_keys=[rejected_by_id])

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
    status = Column(String, default="pending") # Status individual do item
    expected_date = Column(Date, nullable=True)  # Prazo de entrega
    notes = Column(String, nullable=True)

    request = relationship("PurchaseRequest", back_populates="items")

