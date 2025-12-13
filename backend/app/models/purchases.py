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
    
    items = relationship("PurchaseItem", back_populates="request", cascade="all, delete-orphan")

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

