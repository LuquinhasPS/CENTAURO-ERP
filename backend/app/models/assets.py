from sqlalchemy import Column, Integer, String, Enum, Date, ForeignKey, Float, Text, UniqueConstraint
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

class MaintenanceType(str, enum.Enum):
    PREVENTIVA = "PREVENTIVA"
    CORRETIVA = "CORRETIVA"

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
    odometer = Column(Integer, default=0)

    # Maintenance Relationship
    maintenances = relationship("VehicleMaintenance", back_populates="vehicle")
    fuel_costs = relationship("VehicleFuelCost", back_populates="vehicle")
    toll_costs = relationship("VehicleTollCost", back_populates="vehicle")

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

class VehicleMaintenance(Base):
    __tablename__ = "vehicle_maintenances"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("fleet.id"), nullable=False)
    workshop_name = Column(String, nullable=False)
    entry_date = Column(Date, nullable=False)
    exit_date = Column(Date, nullable=True)
    cost = Column(Float, nullable=False)
    odometer = Column(Integer, nullable=False)
    maintenance_type = Column(Enum(MaintenanceType), nullable=False)
    categories = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    attachment = Column(String, nullable=True)

    vehicle = relationship("Fleet", back_populates="maintenances")


class VehicleFuelCost(Base):
    """Monthly fuel cost record per vehicle"""
    __tablename__ = "vehicle_fuel_costs"
    __table_args__ = (
        UniqueConstraint('vehicle_id', 'competence_date', name='uq_vehicle_fuel_month'),
    )

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("fleet.id"), nullable=False)
    competence_date = Column(Date, nullable=False)  # Day 01 of reference month
    total_cost = Column(Float, nullable=False)  # Column Q - "Total (R$) Transação"
    liters = Column(Float, nullable=True)  # Column L - "Litros"
    km_driven = Column(Integer, nullable=True)  # Column K - "Km Rodados"

    vehicle = relationship("Fleet", back_populates="fuel_costs")

class VehicleTollCost(Base):
    """Monthly toll cost record per vehicle"""
    __tablename__ = "vehicle_toll_costs"
    __table_args__ = (
        UniqueConstraint('vehicle_id', 'competence_date', name='uq_vehicle_toll_month'),
    )

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("fleet.id"), nullable=False)
    competence_date = Column(Date, nullable=False)
    total_cost = Column(Float, nullable=False)

    vehicle = relationship("Fleet", back_populates="toll_costs")
