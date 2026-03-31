"""
Asset Requests Router
Handles CRUD for asset requests and approval workflow with Scheduler integration.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import timedelta

from app.database import get_db
from app.models.asset_requests import AssetRequest, AssetRequestStatus, AssetType
from app.models.operational import Allocation
from app.models.project_resources import ProjectVehicle, ProjectTool
from app.models.users import User
from app.models.commercial import Project
from app.models.assets import Fleet, Tool
from app.schemas.asset_requests import (
    AssetRequestCreate, AssetRequestApprove, AssetRequestReject, AssetRequestResponse
)
from app.auth import get_current_user

router = APIRouter()


from sqlalchemy.orm import selectinload

async def _enrich_request(req: AssetRequest, db: AsyncSession) -> dict:
    """Add human-readable labels to a request object."""
    data = {
        "id": req.id,
        "requester_id": req.requester_id,
        "project_id": req.project_id,
        "asset_type": req.asset_type.value if hasattr(req.asset_type, 'value') else req.asset_type,
        "description": req.description,
        "start_date": req.start_date,
        "end_date": req.end_date,
        "include_weekends": req.include_weekends,
        "status": req.status.value if hasattr(req.status, 'value') else req.status,
        "assigned_vehicle_id": req.assigned_vehicle_id,
        "assigned_tool_id": req.assigned_tool_id,
        "rejection_reason": req.rejection_reason,
        "created_at": req.created_at,
        "requester_name": None,
        "project_tag": None,
        "project_name": None,
        "assigned_asset_label": None,
    }

    # Requester name - Use selectinload to avoid async lazy loading error
    user_result = await db.execute(
        select(User).options(selectinload(User.collaborator)).where(User.id == req.requester_id)
    )
    user = user_result.scalar_one_or_none()
    if user:
        if user.collaborator:
            data["requester_name"] = user.collaborator.name
        else:
            data["requester_name"] = user.email

    # Project info
    proj_result = await db.execute(select(Project).where(Project.id == req.project_id))
    proj = proj_result.scalar_one_or_none()
    if proj:
        data["project_tag"] = proj.tag
        data["project_name"] = proj.name

    # Assigned asset label
    if req.assigned_vehicle_id:
        v_result = await db.execute(select(Fleet).where(Fleet.id == req.assigned_vehicle_id))
        v = v_result.scalar_one_or_none()
        if v:
            data["assigned_asset_label"] = f"{v.model} - {v.license_plate}"
    elif req.assigned_tool_id:
        t_result = await db.execute(select(Tool).where(Tool.id == req.assigned_tool_id))
        t = t_result.scalar_one_or_none()
        if t:
            data["assigned_asset_label"] = t.name

    return data


@router.post("/asset-requests", response_model=AssetRequestResponse)
async def create_asset_request(
    data: AssetRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new asset request from a project."""
    db_request = AssetRequest(
        requester_id=current_user.id,
        project_id=data.project_id,
        asset_type=AssetType(data.asset_type),
        description=data.description,
        start_date=data.start_date,
        end_date=data.end_date,
        include_weekends=data.include_weekends,
        status=AssetRequestStatus.PENDING,
    )
    db.add(db_request)
    await db.commit()
    await db.refresh(db_request)

    return await _enrich_request(db_request, db)


@router.get("/asset-requests", response_model=List[AssetRequestResponse])
async def list_asset_requests(
    status: Optional[str] = Query(None),
    asset_type: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List asset requests with optional filters."""
    query = select(AssetRequest).order_by(AssetRequest.created_at.desc())

    if status:
        query = query.where(AssetRequest.status == AssetRequestStatus(status))
    if asset_type:
        query = query.where(AssetRequest.asset_type == AssetType(asset_type))
    if project_id:
        query = query.where(AssetRequest.project_id == project_id)

    result = await db.execute(query)
    requests = result.scalars().all()

    enriched = []
    for req in requests:
        enriched.append(await _enrich_request(req, db))

    return enriched


@router.patch("/asset-requests/{request_id}/approve", response_model=AssetRequestResponse)
async def approve_asset_request(
    request_id: int,
    data: AssetRequestApprove,
    db: AsyncSession = Depends(get_db),
):
    """
    Approve an asset request:
    1. Set status to APPROVED
    2. Assign the chosen vehicle/tool
    3. Create Allocation records in the scheduler
    4. Create a ProjectVehicle/ProjectTool link
    """
    result = await db.execute(select(AssetRequest).where(AssetRequest.id == request_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    if req.status != AssetRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="Solicitação já foi processada")

    # Validate that the correct asset type was provided
    if req.asset_type == AssetType.VEHICLE:
        if not data.assigned_vehicle_id:
            raise HTTPException(status_code=400, detail="Informe o veículo a ser alocado (assigned_vehicle_id)")
        req.assigned_vehicle_id = data.assigned_vehicle_id
        resource_type = "CAR"
        resource_id = data.assigned_vehicle_id
        description_prefix = "Veículo"

        # Create ProjectVehicle link
        pv = ProjectVehicle(
            project_id=req.project_id,
            vehicle_id=data.assigned_vehicle_id,
            start_date=req.start_date,
            end_date=req.end_date,
        )
        db.add(pv)

    elif req.asset_type == AssetType.TOOL:
        if not data.assigned_tool_id:
            raise HTTPException(status_code=400, detail="Informe a ferramenta a ser alocada (assigned_tool_id)")
        req.assigned_tool_id = data.assigned_tool_id
        resource_type = "TOOL"
        resource_id = data.assigned_tool_id
        description_prefix = "Ferramenta"

        # Create ProjectTool link
        pt = ProjectTool(
            project_id=req.project_id,
            tool_id=data.assigned_tool_id,
            start_date=req.start_date,
            end_date=req.end_date,
        )
        db.add(pt)
    else:
        raise HTTPException(status_code=400, detail="Tipo de ativo inválido")

    # Update status
    req.status = AssetRequestStatus.APPROVED

    # Create Allocation records (same logic as project_resources.py)
    import holidays
    br_holidays = holidays.BR()
    days_created = 0
    current_date = req.start_date

    while current_date <= req.end_date:
        is_weekend = current_date.weekday() >= 5
        is_holiday = current_date in br_holidays

        if (is_weekend or is_holiday) and not req.include_weekends:
            current_date += timedelta(days=1)
            continue

        # Delete existing allocation for this resource on this date (avoid dups)
        existing = await db.execute(select(Allocation).where(
            Allocation.date == current_date,
            Allocation.resource_id == resource_id,
            Allocation.resource_type == resource_type,
        ))
        for row in existing.scalars().all():
            await db.delete(row)

        new_alloc = Allocation(
            date=current_date,
            resource_type=resource_type,
            resource_id=resource_id,
            project_id=req.project_id,
            type="RESERVATION",
            description=f"{description_prefix} no Projeto {req.project_id} (Solicitação #{req.id})"
        )
        db.add(new_alloc)
        days_created += 1
        current_date += timedelta(days=1)

    if days_created == 0:
        raise HTTPException(status_code=400, detail="Nenhum dia útil no intervalo selecionado.")

    await db.commit()
    await db.refresh(req)

    return await _enrich_request(req, db)


@router.patch("/asset-requests/{request_id}/reject", response_model=AssetRequestResponse)
async def reject_asset_request(
    request_id: int,
    data: AssetRequestReject,
    db: AsyncSession = Depends(get_db),
):
    """Reject an asset request with a reason."""
    result = await db.execute(select(AssetRequest).where(AssetRequest.id == request_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    if req.status != AssetRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="Solicitação já foi processada")

    req.status = AssetRequestStatus.REJECTED
    req.rejection_reason = data.rejection_reason

    await db.commit()
    await db.refresh(req)

    return await _enrich_request(req, db)
