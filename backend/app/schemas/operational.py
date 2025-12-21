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

# Collaborator Review Schemas
class CollaboratorReviewBase(BaseModel):
    date: date
    score_technical: int
    score_safety: int
    score_punctuality: int
    comments: Optional[str] = None

class CollaboratorReviewCreate(CollaboratorReviewBase):
    collaborator_id: int

class CollaboratorReviewResponse(CollaboratorReviewBase):
    id: int
    reviewer_id: int
    reviewer_name: Optional[str] = None # Resolved from User -> Collaborator

    class Config:
        from_attributes = True

class CollaboratorPerformanceStats(BaseModel):
    avg_technical: float
    avg_safety: float
    avg_punctuality: float
    avg_general: float
    total_reviews: int

# Collaborator Schemas
class TeamSummary(BaseModel):
    """Summary schema for Team (used in Collaborator response)"""
    id: int
    name: str
    
    class Config:
        from_attributes = True

class CollaboratorBase(BaseModel):
    name: str
    registration_number: Optional[str] = None
    cpf: Optional[str] = None
    rg: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    salary: Optional[str] = None
    role_id: Optional[int] = None
    role: Optional[str] = None  # Mantendo por compatibilidade
    cnh_number: Optional[str] = None
    cnh_category: Optional[str] = None
    cnh_validity: Optional[date] = None

class CollaboratorCreate(CollaboratorBase):
    team_ids: list[int] = []  # N:N - list of team IDs

class CollaboratorResponse(CollaboratorBase):
    id: int
    certifications: list[CertificationResponse] = []
    education: list[CollaboratorEducationResponse] = []
    teams: list[TeamSummary] = []  # N:N - list of teams
    
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
    include_weekends: bool = False

class AllocationResponse(AllocationBase):
    id: int
    date: date
    
    class Config:
        from_attributes = True
