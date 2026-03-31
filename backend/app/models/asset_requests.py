"""
Asset Requests Model
Handles requests for vehicles/tools from projects, approved by fleet/tool coordinators.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Enum, Boolean, Text
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class AssetRequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class AssetType(str, enum.Enum):
    VEHICLE = "VEHICLE"
    TOOL = "TOOL"


class AssetRequest(Base):
    __tablename__ = "asset_requests"

    id = Column(Integer, primary_key=True, index=True)
    
    # Who is requesting
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Which project
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    
    # What type of asset
    asset_type = Column(Enum(AssetType), nullable=False)
    
    # Description of the need (e.g. "Preciso de uma picape para levar escadas")
    description = Column(Text, nullable=False)
    
    # Requested period
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    include_weekends = Column(Boolean, default=False)
    
    # Status
    status = Column(Enum(AssetRequestStatus), default=AssetRequestStatus.PENDING)
    
    # Assigned asset (filled on approval by coordinator)
    assigned_vehicle_id = Column(Integer, ForeignKey("fleet.id"), nullable=True)
    assigned_tool_id = Column(Integer, ForeignKey("tools.id"), nullable=True)
    
    # Rejection reason
    rejection_reason = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    
    # Relationships
    requester = relationship("app.models.users.User")
    project = relationship("app.models.commercial.Project")
    assigned_vehicle = relationship("app.models.assets.Fleet")
    assigned_tool = relationship("app.models.assets.Tool")
