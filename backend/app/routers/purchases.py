from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models import purchases as models
from app.schemas import purchases as schemas
from app.auth import get_current_active_user
from app.models.users import User, UserRole

router = APIRouter()

from sqlalchemy.orm import selectinload

# Helper to load purchase with approver relationships
async def get_purchase_with_approvers(db: AsyncSession, purchase_id: int):
    query = select(models.PurchaseRequest).options(
        selectinload(models.PurchaseRequest.items),
        selectinload(models.PurchaseRequest.tech_approver).selectinload(User.collaborator),
        selectinload(models.PurchaseRequest.control_approver).selectinload(User.collaborator),
        selectinload(models.PurchaseRequest.finance_approver).selectinload(User.collaborator),
        selectinload(models.PurchaseRequest.rejected_by).selectinload(User.collaborator)
    ).where(models.PurchaseRequest.id == purchase_id)
    result = await db.execute(query)
    return result.scalar_one_or_none()

# Helper to convert purchase to response with approver names
def purchase_to_response(purchase: models.PurchaseRequest) -> dict:
    data = {
        "id": purchase.id,
        "project_id": purchase.project_id,
        "description": purchase.description,
        "requester": purchase.requester,
        "status": purchase.status,
        "shipping_cost": purchase.shipping_cost,
        "created_at": purchase.created_at,
        "items": purchase.items,
        "tech_approval_at": purchase.tech_approval_at,
        "tech_approver_id": purchase.tech_approver_id,
        "tech_approver_name": purchase.tech_approver.collaborator.name if purchase.tech_approver and purchase.tech_approver.collaborator else None,
        "control_approval_at": purchase.control_approval_at,
        "control_approver_id": purchase.control_approver_id,
        "control_approver_name": purchase.control_approver.collaborator.name if purchase.control_approver and purchase.control_approver.collaborator else None,
        "finance_approval_at": purchase.finance_approval_at,
        "finance_approver_id": purchase.finance_approver_id,
        "finance_approver_name": purchase.finance_approver.collaborator.name if purchase.finance_approver and purchase.finance_approver.collaborator else None,
        "rejection_reason": purchase.rejection_reason,
        "rejected_by_id": purchase.rejected_by_id,
        "rejected_by_name": purchase.rejected_by.collaborator.name if purchase.rejected_by and purchase.rejected_by.collaborator else None,
        "rejected_at": purchase.rejected_at,
    }
    return data

@router.get("/purchases", response_model=List[schemas.PurchaseRequestResponse])
async def get_purchases(
    project_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    query = select(models.PurchaseRequest).options(
        selectinload(models.PurchaseRequest.items),
        selectinload(models.PurchaseRequest.tech_approver).selectinload(User.collaborator),
        selectinload(models.PurchaseRequest.control_approver).selectinload(User.collaborator),
        selectinload(models.PurchaseRequest.finance_approver).selectinload(User.collaborator),
        selectinload(models.PurchaseRequest.rejected_by).selectinload(User.collaborator)
    )
    if project_id:
        query = query.where(models.PurchaseRequest.project_id == project_id)
    result = await db.execute(query)
    purchases = result.scalars().all()
    return [purchase_to_response(p) for p in purchases]

@router.post("/purchases", response_model=schemas.PurchaseRequestResponse)
async def create_purchase(purchase: schemas.PurchaseRequestCreate, db: AsyncSession = Depends(get_db)):
    # Create Request
    db_request = models.PurchaseRequest(
        project_id=purchase.project_id,
        description=purchase.description,
        requester=purchase.requester,
        status=purchase.status,
        shipping_cost=purchase.shipping_cost
    )
    db.add(db_request)
    await db.commit()
    await db.refresh(db_request)

    # Create Items if any
    if purchase.items:
        for item in purchase.items:
            db_item = models.PurchaseItem(**item.model_dump(), request_id=db_request.id)
            db.add(db_item)
        await db.commit()
        await db.refresh(db_request) # Refresh to load items

    # Re-fetch with items to ensure response model is satisfied
    purchase_obj = await get_purchase_with_approvers(db, db_request.id)
    return purchase_to_response(purchase_obj)

@router.get("/purchases/{id}", response_model=schemas.PurchaseRequestResponse)
async def get_purchase(id: int, db: AsyncSession = Depends(get_db)):
    purchase = await get_purchase_with_approvers(db, id)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    return purchase_to_response(purchase)

@router.put("/purchases/{id}", response_model=schemas.PurchaseRequestResponse)
async def update_purchase(id: int, purchase: schemas.PurchaseRequestCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.PurchaseRequest).options(selectinload(models.PurchaseRequest.items)).where(models.PurchaseRequest.id == id))
    db_purchase = result.scalar_one_or_none()
    if not db_purchase:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    
    # Update Request fields
    db_purchase.project_id = purchase.project_id
    db_purchase.description = purchase.description
    db_purchase.requester = purchase.requester
    db_purchase.status = purchase.status
    db_purchase.shipping_cost = purchase.shipping_cost
    
    # Update Items (Full replacement strategy for simplicity in this prototype)
    # Delete existing items
    for item in db_purchase.items:
        await db.delete(item)
    
    # Add new items
    if purchase.items:
        for item in purchase.items:
            db_item = models.PurchaseItem(**item.model_dump(), request_id=db_purchase.id)
            db.add(db_item)
    
    await db.commit()
    
    # Re-fetch
    purchase_obj = await get_purchase_with_approvers(db, id)
    return purchase_to_response(purchase_obj)

@router.delete("/purchases/{id}")
async def delete_purchase(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.PurchaseRequest).where(models.PurchaseRequest.id == id))
    db_purchase = result.scalar_one_or_none()
    if not db_purchase:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    
    await db.delete(db_purchase)
    await db.commit()
    return {"message": "Purchase request deleted"}

# ================================
# APPROVAL WORKFLOW ENDPOINTS
# ================================

@router.put("/purchases/{id}/approve", response_model=schemas.PurchaseRequestResponse)
async def approve_purchase(
    id: int, 
    approval: schemas.ApprovalRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Approve a purchase request. Requires specific role based on approval type."""
    
    # Get purchase
    purchase = await get_purchase_with_approvers(db, id)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    
    # Check if already rejected
    if purchase.status == "rejected":
        raise HTTPException(status_code=400, detail="Cannot approve a rejected request. Clear rejection first.")
    
    # Get user permissions from role
    user_permissions = current_user.permissions or {}
    approvals_permissions = user_permissions.get('approvals', {})
    is_superuser = current_user.is_superuser
    
    if approval.approval_type == schemas.ApprovalType.TECH:
        # Check approve_technical permission
        has_permission = approvals_permissions.get('approve_technical', False) or is_superuser
        if not has_permission:
            raise HTTPException(status_code=403, detail="Permissão negada. Você não tem alçada para Validação Técnica.")
        
        purchase.tech_approval_at = datetime.utcnow()
        purchase.tech_approver_id = current_user.id
        
    elif approval.approval_type == schemas.ApprovalType.CONTROL:
        # Check approve_budget permission
        has_permission = approvals_permissions.get('approve_budget', False) or is_superuser
        if not has_permission:
            raise HTTPException(status_code=403, detail="Permissão negada. Você não tem alçada para Controle de Projetos.")
        
        purchase.control_approval_at = datetime.utcnow()
        purchase.control_approver_id = current_user.id
        
    elif approval.approval_type == schemas.ApprovalType.FINANCE:
        # Check approve_finance permission
        has_permission = approvals_permissions.get('approve_finance', False) or is_superuser
        if not has_permission:
            raise HTTPException(status_code=403, detail="Permissão negada. Você não tem alçada para Liberação Financeira.")
        
        purchase.finance_approval_at = datetime.utcnow()
        purchase.finance_approver_id = current_user.id
    
    # Clear any previous rejection if re-approving
    purchase.rejection_reason = None
    purchase.rejected_by_id = None
    purchase.rejected_at = None
    
    # Check if all 3 approvals are complete
    if (purchase.tech_approval_at and 
        purchase.control_approval_at and 
        purchase.finance_approval_at):
        purchase.status = "approved"
    
    await db.commit()
    
    # Re-fetch with relationships
    purchase_obj = await get_purchase_with_approvers(db, id)
    return purchase_to_response(purchase_obj)

@router.put("/purchases/{id}/reject", response_model=schemas.PurchaseRequestResponse)
async def reject_purchase(
    id: int, 
    rejection: schemas.RejectionRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Reject a purchase request. Any approver role can reject."""
    
    # Get purchase
    purchase = await get_purchase_with_approvers(db, id)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    
    # RBAC: Any user with approval permissions can reject
    user_permissions = current_user.permissions or {}
    approvals_permissions = user_permissions.get('approvals', {})
    is_superuser = current_user.is_superuser
    
    has_any_approval = (
        approvals_permissions.get('approve_technical', False) or
        approvals_permissions.get('approve_budget', False) or
        approvals_permissions.get('approve_finance', False) or
        is_superuser
    )
    
    if not has_any_approval:
        raise HTTPException(status_code=403, detail="Permissão negada. Apenas aprovadores podem rejeitar.")
    
    # Clear all approvals
    purchase.tech_approval_at = None
    purchase.tech_approver_id = None
    purchase.control_approval_at = None
    purchase.control_approver_id = None
    purchase.finance_approval_at = None
    purchase.finance_approver_id = None
    
    # Set rejection info
    purchase.rejection_reason = rejection.reason
    purchase.rejected_by_id = current_user.id
    purchase.rejected_at = datetime.utcnow()
    purchase.status = "rejected"
    
    await db.commit()
    
    # Re-fetch with relationships
    purchase_obj = await get_purchase_with_approvers(db, id)
    return purchase_to_response(purchase_obj)

@router.put("/purchases/{id}/clear-rejection", response_model=schemas.PurchaseRequestResponse)
async def clear_rejection(
    id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Clear rejection status to allow re-approval. Only the original requester or admin can do this."""
    
    purchase = await get_purchase_with_approvers(db, id)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    
    if purchase.status != "rejected":
        raise HTTPException(status_code=400, detail="Request is not rejected")
    
    # Clear rejection
    purchase.rejection_reason = None
    purchase.rejected_by_id = None
    purchase.rejected_at = None
    purchase.status = "pending"
    
    await db.commit()
    
    purchase_obj = await get_purchase_with_approvers(db, id)
    return purchase_to_response(purchase_obj)

# Item management endpoints (optional, but good for granular updates)
@router.post("/purchases/{id}/items", response_model=schemas.PurchaseItemResponse)
async def create_purchase_item(id: int, item: schemas.PurchaseItemCreate, db: AsyncSession = Depends(get_db)):
    # Verify request exists
    result = await db.execute(select(models.PurchaseRequest).where(models.PurchaseRequest.id == id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Purchase request not found")

    db_item = models.PurchaseItem(**item.model_dump(), request_id=id)
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item

@router.delete("/purchases/items/{item_id}")
async def delete_purchase_item(item_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.PurchaseItem).where(models.PurchaseItem.id == item_id))
    db_item = result.scalar_one_or_none()
    if not db_item:
        raise HTTPException(status_code=404, detail="Purchase item not found")
    
    await db.delete(db_item)
    await db.commit()
    return {"message": "Purchase item deleted"}

