from sqlalchemy import Column, Integer, String, Enum, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class FleetStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    MAINTENANCE = "MAINTENANCE"

class ToolStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    IN_USE = "IN_USE"
    MAINTENANCE = "MAINTENANCE"

class FuelType(str, enum.Enum):
    ALCOOL = "Alcool"
    GASOLINA = "Gasolina"
    FLEX = "Flex"
    GNV = "GNV"
    GNV_ALCOOL = "GNV + Alcool"
    GNV_GASOLINA = "GNV + Gasolina"
    DIESEL = "Diesel"

class Insurance(Base):
    __tablename__ = "insurances"

    id = Column(Integer, primary_key=True, index=True)
    insurance_company = Column(String)
    policy_number = Column(String)
    validity = Column(Date)
    claims_info = Column(String, nullable=True) # "Como acionar sinistro"
    
    # Relationship
    vehicles = relationship("Fleet", back_populates="insurance")

class Fleet(Base):
    __tablename__ = "fleet"

    id = Column(Integer, primary_key=True, index=True)
    license_plate = Column(String, unique=True, index=True)
    model = Column(String)
    brand = Column(String)
    year = Column(Integer)
    
    # Owner
    cnpj = Column(String, nullable=True) # CNPJ of the owner (Headquarters/Branch)
    
    # Insurance Relationship
    insurance_id = Column(Integer, ForeignKey("insurances.id"), nullable=True)
    insurance = relationship("Insurance", back_populates="vehicles")
    
    color = Column(String, nullable=True)
    fuel_type = Column(Enum(FuelType), nullable=True)
    status = Column(Enum(FleetStatus), default=FleetStatus.ACTIVE)

class Tool(Base):
    __tablename__ = "tools"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    serial_number = Column(String, unique=True)
    status = Column(Enum(ToolStatus), default=ToolStatus.AVAILABLE)
    
    # "Com quem" - Mandatory
    current_holder = Column(String, nullable=False) 
    # "Onde" - Optional
    current_location = Column(String, nullable=True)
