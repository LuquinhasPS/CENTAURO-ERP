from sqlalchemy import Column, Integer, String, Float, Date, DateTime
from datetime import datetime
from app.database import Base

class PurchaseRequest(Base):
    __tablename__ = "purchase_requests"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, nullable=True)  # Pode ser uma compra geral, sem projeto
    description = Column(String, nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0.0)
    total_price = Column(Float, default=0.0)
    supplier = Column(String, nullable=True)  # Fornecedor
    status = Column(String, default="pending")  # pending, approved, rejected, ordered, received
    requested_date = Column(DateTime, default=datetime.utcnow)
    expected_date = Column(Date, nullable=True)
    requester = Column(String, nullable=True)  # Nome do solicitante
    notes = Column(String, nullable=True)
