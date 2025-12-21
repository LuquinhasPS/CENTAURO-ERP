"""
Junction table for Many-to-Many relationship between Collaborator and Team
"""
from sqlalchemy import Column, Integer, ForeignKey, Table
from app.database import Base

# Association table for N:N relationship
collaborator_teams = Table(
    'collaborator_teams',
    Base.metadata,
    Column('collaborator_id', Integer, ForeignKey('collaborators.id', ondelete='CASCADE'), primary_key=True),
    Column('team_id', Integer, ForeignKey('teams.id', ondelete='CASCADE'), primary_key=True)
)
