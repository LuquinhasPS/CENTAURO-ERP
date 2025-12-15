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

# Education Schemas
class CollaboratorEducationBase(BaseModel):
    type: str # ACADEMIC, TECHNICAL, CERTIFICATION
    institution: str
    course_name: str
    conclusion_date: date
    attachment_url: Optional[str] = None
    collaborator_id: int

class CollaboratorEducationCreate(CollaboratorEducationBase):
    pass

class CollaboratorEducationResponse(CollaboratorEducationBase):
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
    team_id: Optional[int] = None
    role: Optional[str] = None  # Mantendo por compatibilidade
    cnh_number: Optional[str] = None
    cnh_category: Optional[str] = None
    cnh_validity: Optional[date] = None

class CollaboratorCreate(CollaboratorBase):
    pass

class CollaboratorResponse(CollaboratorBase):
    id: int
    certifications: list[CertificationResponse] = []
    education: list[CollaboratorEducationResponse] = []
    
    class Config:
        from_attributes = True

# Allocation Schemas
# Allocation Schemas
class AllocationBase(BaseModel):
    resource_type: str  # CAR or PERSON
    resource_id: int
    description: Optional[str] = None
    type: str  # RESERVATION or JUSTIFICATION
    project_id: Optional[int] = None
    contract_id: Optional[int] = None

class AllocationCreate(AllocationBase):
    start_date: date
    end_date: date

class AllocationResponse(AllocationBase):
    id: int
    date: date
    
    class Config:
        from_attributes = True
