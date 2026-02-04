from pydantic import BaseModel
from typing import Optional, List
from datetime import date

from app.models.assets import FuelType, FleetStatus
from app.schemas.maintenance import VehicleMaintenanceResponse

# Insurance Schemas
class InsuranceBase(BaseModel):
    insurance_company: str
    policy_number: str
    validity: date
    claims_info: Optional[str] = None

class InsuranceCreate(InsuranceBase):
    pass

class InsuranceResponse(InsuranceBase):
    id: int
    
    class Config:
        from_attributes = True

# Fleet Schemas
class FleetBase(BaseModel):
    license_plate: str
    model: str
    brand: str
    year: int
    cnpj: Optional[str] = None
    insurance_id: Optional[int] = None
    color: Optional[str] = None
    fuel_type: Optional[FuelType] = None
    status: FleetStatus = FleetStatus.ACTIVE
    odometer: Optional[int] = 0

class FleetCreate(FleetBase):
    pass

class FleetResponse(FleetBase):
    id: int
    insurance: Optional[InsuranceResponse] = None
    maintenances: List[VehicleMaintenanceResponse] = []
    
    class Config:
        from_attributes = True

# Tool Schemas
class ToolBase(BaseModel):
    name: str
    serial_number: str
    current_holder: str
    current_location: Optional[str] = None
    status: str = "AVAILABLE"
    category: Optional[str] = "OTHER"
    condition: Optional[str] = "GOOD"
    next_maintenance: Optional[date] = None

class ToolCreate(ToolBase):
    pass

class ToolResponse(ToolBase):
    id: int
    
    class Config:
        from_attributes = True


# Vehicle Fuel Cost Schemas
class VehicleFuelCostBase(BaseModel):
    vehicle_id: int
    competence_date: date
    total_cost: float
    liters: Optional[float] = None
    km_driven: Optional[int] = None

class VehicleFuelCostCreate(VehicleFuelCostBase):
    pass

class VehicleFuelCostResponse(VehicleFuelCostBase):
    id: int
    
    class Config:
        from_attributes = True

# Vehicle Toll Cost Schemas
class VehicleTollCostBase(BaseModel):
    vehicle_id: int
    competence_date: date
    total_cost: float

class VehicleTollCostCreate(VehicleTollCostBase):
    pass

class VehicleTollCostResponse(VehicleTollCostBase):
    id: int
    
    class Config:
        from_attributes = True
