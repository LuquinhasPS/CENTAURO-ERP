from sqlalchemy import Column, Integer, String, ForeignKey, Date, Enum
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class ResourceType(str, enum.Enum):
    CAR = "CAR"
    PERSON = "PERSON"

class AllocationType(str, enum.Enum):
    RESERVATION = "RESERVATION"
    JUSTIFICATION = "JUSTIFICATION"

class Collaborator(Base):
    __tablename__ = "collaborators"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)  # Nome completo
    cpf = Column(String, unique=True, nullable=True)
    rg = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    salary = Column(String, nullable=True)  # Salário como string para manter formatação
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)
    role = Column(String, nullable=True)  # Mantendo por compatibilidade
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    
    role_obj = relationship("app.models.roles.Role")
    team = relationship("app.models.teams.Team", back_populates="members", foreign_keys=[team_id])
    
    # CNH Data
    cnh_number = Column(String, nullable=True)
    cnh_category = Column(String, nullable=True)
    cnh_validity = Column(Date, nullable=True)

class Allocation(Base):
    __tablename__ = "allocations"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, index=True)
    
    resource_type = Column(Enum(ResourceType))
    resource_id = Column(Integer)  # ID of Fleet or Collaborator
    
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=True)
    
    description = Column(String)
    type = Column(Enum(AllocationType))

    project = relationship("app.models.commercial.Project")
    contract = relationship("app.models.commercial.Contract")

class CertificationType(str, enum.Enum):
    NR = "NR"
    ASO = "ASO"
    TRAINING = "TRAINING"

class Certification(Base):
    __tablename__ = "certifications"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)  # Ex: "NR-10", "ASO Admissional", "Treinamento Altura"
    type = Column(Enum(CertificationType))
    validity = Column(Date)
    collaborator_id = Column(Integer, ForeignKey("collaborators.id"))

    collaborator = relationship("Collaborator", back_populates="certifications")

# Update Collaborator to include certifications relationship
Collaborator.certifications = relationship("Certification", back_populates="collaborator", cascade="all, delete-orphan")

class EducationType(str, enum.Enum):
    ACADEMIC = "ACADEMIC"
    TECHNICAL = "TECHNICAL"
    CERTIFICATION = "CERTIFICATION"

class CollaboratorEducation(Base):
    __tablename__ = "collaborator_education"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum(EducationType))
    institution = Column(String)
    course_name = Column(String)
    conclusion_date = Column(Date)
    attachment_url = Column(String, nullable=True)
    collaborator_id = Column(Integer, ForeignKey("collaborators.id"))

    collaborator = relationship("Collaborator", back_populates="education")

# Update Collaborator to include education relationship
Collaborator.education = relationship("CollaboratorEducation", back_populates="collaborator", cascade="all, delete-orphan")

class CollaboratorReview(Base):
    __tablename__ = "collaborator_reviews"

    id = Column(Integer, primary_key=True, index=True)
    collaborator_id = Column(Integer, ForeignKey("collaborators.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    
    # 1-5 Scores
    score_technical = Column(Integer, nullable=False)
    score_safety = Column(Integer, nullable=False)
    score_punctuality = Column(Integer, nullable=False)
    
    comments = Column(String, nullable=True)

    collaborator = relationship("Collaborator", back_populates="reviews")
    reviewer = relationship("app.models.users.User")

# Update Collaborator to include reviews relationship
Collaborator.reviews = relationship("CollaboratorReview", back_populates="collaborator", order_by="desc(CollaboratorReview.date)", cascade="all, delete-orphan")
