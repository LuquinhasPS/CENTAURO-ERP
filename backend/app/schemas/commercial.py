from pydantic import BaseModel
from typing import Optional
from datetime import date
from decimal import Decimal

# Client Schemas
class ClientBase(BaseModel):
    name: str
    client_number: Optional[str] = None
    cnpj: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientResponse(ClientBase):
    id: int
    
    class Config:
        from_attributes = True

# Contract Schemas
class ContractBase(BaseModel):
    client_id: int
    description: str

class ContractCreate(ContractBase):
    pass

class ContractResponse(ContractBase):
    id: int
    
    class Config:
        from_attributes = True

# Project Schemas
class ProjectBase(BaseModel):
    tag: str
    name: str
    scope: Optional[str] = None
    coordinator: Optional[str] = None
    contract_id: Optional[int] = None
    service_value: Optional[Decimal] = None
    material_value: Optional[Decimal] = None
    budget: Optional[Decimal] = None
    invoiced: Optional[Decimal] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    estimated_date: Optional[date] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: int
    
    class Config:
        from_attributes = True
