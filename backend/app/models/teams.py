from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.collaborator_teams import collaborator_teams

class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    leader_id = Column(Integer, ForeignKey("collaborators.id"), nullable=True)

    # Relationships
    leader = relationship("Collaborator", foreign_keys=[leader_id], backref="led_teams")
    members = relationship("Collaborator", secondary=collaborator_teams, back_populates="teams")

