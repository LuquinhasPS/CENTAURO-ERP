"""
Models Package
Imports all models to ensure SQLAlchemy can resolve relationships
"""
from .commercial import Client, Contract, Project, ProjectFeedback
from .finance import ProjectBilling, BillingStatus  # NEW - Finance models
from .client_contacts import ClientContact
from .assets import Fleet, Tool
from .collaborator_teams import collaborator_teams  # Must be before operational
from .teams import Team
from .operational import Allocation, Collaborator
from .tickets import Ticket
from .roles import Role
from .kanban import Task
from .project_resources import ProjectCollaborator, ProjectTool, ProjectVehicle
from .purchases import PurchaseRequest, PurchaseWithdrawal, PurchaseWithdrawalItem
from .proposals import CommercialProposal, ProposalTask
from .users import User
from .asset_requests import AssetRequest
