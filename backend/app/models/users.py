from sqlalchemy import Column, Integer, String, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    ENGENHARIA = "ENGENHARIA"
    FINANCEIRO = "FINANCEIRO"
    RH = "RH"
    VISUALIZADOR = "VISUALIZADOR"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.VISUALIZADOR)
    is_superuser = Column(Boolean, default=False)
    collaborator_id = Column(Integer, ForeignKey("collaborators.id"), nullable=True)

    collaborator = relationship("app.models.operational.Collaborator")

    @property
    def permissions(self):
        if self.is_superuser:
            return {"superuser": True, "all": True}
        if self.collaborator and self.collaborator.role_obj:
            return self.collaborator.role_obj.permissions
        return {}
