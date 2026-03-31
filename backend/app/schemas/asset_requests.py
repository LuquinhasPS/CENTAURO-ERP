"""
Asset Requests Schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class AssetRequestCreate(BaseModel):
    project_id: int
    asset_type: str  # "VEHICLE" or "TOOL"
    description: str
    start_date: date
    end_date: date
    include_weekends: bool = False


class AssetRequestApprove(BaseModel):
    assigned_vehicle_id: Optional[int] = None
    assigned_tool_id: Optional[int] = None


class AssetRequestReject(BaseModel):
    rejection_reason: str


class AssetRequestResponse(BaseModel):
    id: int
    requester_id: int
    project_id: int
    asset_type: str
    description: str
    start_date: date
    end_date: date
    include_weekends: bool
    status: str
    assigned_vehicle_id: Optional[int] = None
    assigned_tool_id: Optional[int] = None
    rejection_reason: Optional[str] = None
    created_at: datetime

    # Enriched fields (added by router)
    requester_name: Optional[str] = None
    project_tag: Optional[str] = None
    project_name: Optional[str] = None
    assigned_asset_label: Optional[str] = None

    class Config:
        from_attributes = True
