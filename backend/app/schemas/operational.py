from pydantic import BaseModel
from typing import Optional
from datetime import date

# Certification Schemas
class CertificationBase(BaseModel):
    name: str
    type: str  # NR, ASO, TRAINING
    validity: date
    collaborator_id: int

class CertificationCreate(CertificationBase):
    pass

class CertificationResponse(CertificationBase):
    id: int
    
    class Config:
        from_attributes = True

# Collaborator Schemas
class CollaboratorBase(BaseModel):
    name: str
    cpf: Optional[str] = None
    rg: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    salary: Optional[str] = None
    role_id: Optional[int] = None
    role: Optional[str] = None  # Mantendo por compatibilidade

class CollaboratorCreate(CollaboratorBase):
    pass

class CollaboratorResponse(CollaboratorBase):
    id: int
    certifications: list[CertificationResponse] = []
    
    class Config:
        from_attributes = True

# Allocation Schemas
class AllocationBase(BaseModel):
    date: date
    resource_type: str  # CAR or PERSON
    resource_id: int
    description: Optional[str] = None
    type: str  # RESERVATION or JUSTIFICATION
    project_id: Optional[int] = None
    contract_id: Optional[int] = None

class AllocationCreate(AllocationBase):
    pass

class AllocationResponse(AllocationBase):
    id: int
    
    class Config:
        from_attributes = True
