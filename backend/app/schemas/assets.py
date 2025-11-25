from pydantic import BaseModel
from typing import Optional
from datetime import date

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
    fuel_type: Optional[str] = None
    status: str = "ACTIVE"

class FleetCreate(FleetBase):
    pass

class FleetResponse(FleetBase):
    id: int
    insurance: Optional[InsuranceResponse] = None
    
    class Config:
        from_attributes = True

# Tool Schemas
class ToolBase(BaseModel):
    name: str
    serial_number: str
    current_holder: str
    current_location: Optional[str] = None
    status: str = "AVAILABLE"

class ToolCreate(ToolBase):
    pass

class ToolResponse(ToolBase):
    id: int
    
    class Config:
        from_attributes = True
