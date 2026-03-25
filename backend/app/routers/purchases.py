from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime
from app.utils.timezone import now_brazil
from app.database import get_db
from app.models import purchases as models
from app.schemas import purchases as schemas
from app.auth import get_current_active_user
from app.auth import get_current_active_user
from app.models.users import User, UserRole
from app.models.commercial import Project, Client

router = APIRouter()

from sqlalchemy.orm import selectinload

# Helper to load purchase with approver relationships
async def get_purchase_with_approvers(db: AsyncSession, purchase_id: int):
    query = select(models.PurchaseRequest).options(
        selectinload(models.PurchaseRequest.items),
        selectinload(models.PurchaseRequest.project).selectinload(Project.client),
        selectinload(models.PurchaseRequest.tech_approver).selectinload(User.collaborator),
        selectinload(models.PurchaseRequest.control_approver).selectinload(User.collaborator),
        selectinload(models.PurchaseRequest.finance_approver).selectinload(User.collaborator),
        selectinload(models.PurchaseRequest.rejected_by).selectinload(User.collaborator),
        selectinload(models.PurchaseRequest.observations).selectinload(models.PurchaseObservation.user).selectinload(User.collaborator)
    ).where(models.PurchaseRequest.id == purchase_id)
    result = await db.execute(query)
    return result.scalar_one_or_none()

# Helper to convert purchase to response with approver names
def purchase_to_response(purchase: models.PurchaseRequest) -> dict:
    data = {
        "id": purchase.id,
        "project_id": purchase.project_id,
        "project_tag": purchase.project.tag if purchase.project else None,
        "project_name": purchase.project.name if purchase.project else None,
        "client_name": purchase.project.client.name if purchase.project and purchase.project.client else None,
        "description": purchase.description,
        "requester": purchase.requester,
        "status": purchase.status,
        "shipping_cost": purchase.shipping_cost,
        "category": purchase.category,
        "service_start_date": purchase.service_start_date,
        "service_end_date": purchase.service_end_date,
        "is_indefinite_term": purchase.is_indefinite_term,
        "arrival_forecast": purchase.arrival_forecast,
        "notes": purchase.notes,
        "created_at": purchase.created_at,
        "observations": [
            {
                "id": obs.id,
                "purchase_id": obs.purchase_id,
                "user_id": obs.user_id,
                "message": obs.message,
                "created_at": obs.created_at,
                "user_name": obs.user.collaborator.name if obs.user and obs.user.collaborator else (obs.user.email if obs.user else None)
            } for obs in purchase.observations
        ] if hasattr(purchase, 'observations') and purchase.observations else [],
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
        selectinload(models.PurchaseRequest.project).selectinload(Project.client),
        selectinload(models.PurchaseRequest.tech_approver).selectinload(User.collaborator),
        selectinload(models.PurchaseRequest.control_approver).selectinload(User.collaborator),
        selectinload(models.PurchaseRequest.finance_approver).selectinload(User.collaborator),
        selectinload(models.PurchaseRequest.rejected_by).selectinload(User.collaborator),
        selectinload(models.PurchaseRequest.observations).selectinload(models.PurchaseObservation.user).selectinload(User.collaborator)
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
        shipping_cost=purchase.shipping_cost,
        category=purchase.category,
        service_start_date=purchase.service_start_date,
        service_end_date=purchase.service_end_date,
        is_indefinite_term=purchase.is_indefinite_term,
        arrival_forecast=purchase.arrival_forecast,
        notes=purchase.notes
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

@router.get("/financial-summary", response_model=schemas.PurchaseFinancialSummary)
async def get_purchase_financial_summary(
    project_id: int, 
    exclude_request_id: Optional[int] = Query(None), 
    db: AsyncSession = Depends(get_db)
):
    # Load project
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    orcamento = 0.0
    if project.material_value:
        orcamento = float(project.material_value)
        
    # Somar todas as compras "MATERIAL" já realizadas neste projeto
    total_realizado = 0.0
    
    query = (
        select(models.PurchaseItem.total_price)
        .join(models.PurchaseRequest)
        .where(models.PurchaseRequest.project_id == project_id)
        .where(models.PurchaseRequest.category == 'MATERIAL')
        .where(models.PurchaseItem.status != 'cancelled')
        .where(models.PurchaseRequest.status != 'cancelled')
        .where(models.PurchaseRequest.status != 'rejected')
    )
    
    if exclude_request_id:
        query = query.where(models.PurchaseRequest.id != exclude_request_id)
        
    items_query = await db.execute(query)
    total_realizado = sum([price or 0.0 for price in items_query.scalars().all()])
        
    saldo_atual = orcamento - total_realizado
    
    return {
        "orcamento_previsto_material": orcamento,
        "saldo_atual_disponivel": saldo_atual,
        "valor_desta_solicitacao": 0.0, # Frontend will override this
        "saldo_restante_previsto": saldo_atual # Frontend will calculate this
    }

# Helper to recalculate status based on approvals and items
def recalculate_purchase_status(purchase: models.PurchaseRequest):
    # 1. Rejected takes precedence
    if purchase.rejected_at:
        purchase.status = "rejected"
        return

    # 2. Check Approvals
    is_fully_approved = (
        purchase.tech_approval_at is not None and 
        purchase.control_approval_at is not None and 
        purchase.finance_approval_at is not None
    )

    if not is_fully_approved:
        purchase.status = "pending"
        return

    # 3. If approved, check items and withdrawals
    if not purchase.items:
        purchase.status = "approved"
        return

    active_items = [i for i in purchase.items if i.status != 'cancelled']
    
    if not active_items:
         purchase.status = "approved"
         return

    # 4. Check withdrawals first (highest priority after rejection)
    total_qty = sum(i.quantity for i in active_items)
    total_withdrawn = sum(i.quantity_withdrawn or 0 for i in active_items)
    
    if total_qty > 0 and total_withdrawn >= total_qty:
        # All items fully withdrawn
        all_fully_withdrawn = all((i.quantity_withdrawn or 0) >= i.quantity for i in active_items)
        if all_fully_withdrawn:
            purchase.status = "received"  # Retirado Total
            return
    
    if total_withdrawn > 0:
        purchase.status = "partially_withdrawn"  # Retirado Parcial
        return

    # 5. Standard item status hierarchy
    all_received = all(i.status == 'delivered' for i in active_items)
    all_in_stock = all(i.status in ['in_stock', 'delivered'] for i in active_items)
    all_bought = all(i.status in ['bought', 'in_stock', 'delivered'] for i in active_items)
    all_quoted = all(i.status in ['quoted', 'bought', 'in_stock', 'delivered'] for i in active_items)

    if all_received:
        purchase.status = "received"  # Retirado Total
    elif all_in_stock:
        purchase.status = "in_stock"  # Em estoque
    elif all_bought:
        purchase.status = "ordered"  # Comprado
    elif all_quoted:
        purchase.status = "quoted"  # Cotado
    else:
        purchase.status = "approved"

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
    # db_purchase.status = purchase.status  <-- REMOVED: Status is now automatic
    db_purchase.shipping_cost = purchase.shipping_cost
    db_purchase.category = purchase.category
    db_purchase.service_start_date = purchase.service_start_date
    db_purchase.service_end_date = purchase.service_end_date
    db_purchase.is_indefinite_term = purchase.is_indefinite_term
    db_purchase.arrival_forecast = purchase.arrival_forecast
    db_purchase.notes = purchase.notes
    
    # Update Items (Full replacement strategy for simplicity in this prototype)
    # Delete existing items
    for item in db_purchase.items:
        await db.delete(item)
    
    # Add new items
    if purchase.items:
        db_purchase.items = [] # clear list for recalculation logic immediately? No, need to commit first usually, but session tracks it.
        # We need to recreate items objects
        new_items = []
        for item in purchase.items:
            db_item = models.PurchaseItem(**item.model_dump(), request_id=db_purchase.id)
            db.add(db_item)
            new_items.append(db_item)
        db_purchase.items = new_items # Associate for calculation

    # Recalculate status
    recalculate_purchase_status(db_purchase)
    
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
        
        purchase.tech_approval_at = now_brazil()
        purchase.tech_approver_id = current_user.id
        
    elif approval.approval_type == schemas.ApprovalType.CONTROL:
        # Check approve_budget permission
        has_permission = approvals_permissions.get('approve_budget', False) or is_superuser
        if not has_permission:
            raise HTTPException(status_code=403, detail="Permissão negada. Você não tem alçada para Controle de Projetos.")
        
        purchase.control_approval_at = now_brazil()
        purchase.control_approver_id = current_user.id
        
    elif approval.approval_type == schemas.ApprovalType.FINANCE:
        # Check approve_finance permission
        has_permission = approvals_permissions.get('approve_finance', False) or is_superuser
        if not has_permission:
            raise HTTPException(status_code=403, detail="Permissão negada. Você não tem alçada para Liberação Financeira.")
        
        purchase.finance_approval_at = now_brazil()
        purchase.finance_approver_id = current_user.id
    
    # Clear any previous rejection if re-approving
    purchase.rejection_reason = None
    purchase.rejected_by_id = None
    purchase.rejected_at = None
    
    # Recalculate Status
    recalculate_purchase_status(purchase)
    
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
    purchase.rejected_at = now_brazil()
    
    # Log Rejection
    db.add(models.PurchaseObservation(
        purchase_id=id,
        user_id=current_user.id,
        message=f"--- SISTEMA ---\n❌ Solicitação REJEITADA.\nMotivo: {rejection.reason}"
    ))

    # Recalculate (will set to rejected)
    recalculate_purchase_status(purchase)
    
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
    
    # Log Reopen
    db.add(models.PurchaseObservation(
        purchase_id=id,
        user_id=current_user.id,
        message="--- SISTEMA ---\n🔄 A rejeição foi desfeita. A solicitação foi REABERTA e retornou para a análise Técnica."
    ))

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

# ================================
# WITHDRAWAL ENDPOINTS
# ================================

@router.post("/purchases/{id}/withdraw", response_model=schemas.WithdrawalResponse)
async def withdraw_purchase(
    id: int,
    withdrawal: schemas.WithdrawalRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Register a material withdrawal (partial or total) from a purchase request."""
    
    # 1. Load purchase with items
    result = await db.execute(
        select(models.PurchaseRequest)
        .options(selectinload(models.PurchaseRequest.items))
        .where(models.PurchaseRequest.id == id)
    )
    purchase = result.scalar_one_or_none()
    if not purchase:
        raise HTTPException(status_code=404, detail="Pedido de compra não encontrado.")
    
    # 2. Validate status allows withdrawal
    allowed_statuses = ['approved', 'ordered', 'quoted', 'in_stock', 'partially_withdrawn', 'received']
    if purchase.status not in allowed_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Não é possível registrar retirada para pedidos com status '{purchase.status}'."
        )
    
    # 3. Validate items
    if not withdrawal.items or len(withdrawal.items) == 0:
        raise HTTPException(status_code=400, detail="Informe ao menos um item para retirada.")
    
    items_map = {item.id: item for item in purchase.items}
    is_partial = False
    
    for wi in withdrawal.items:
        item = items_map.get(wi.item_id)
        if not item:
            raise HTTPException(
                status_code=400, 
                detail=f"Item {wi.item_id} não pertence a este pedido."
            )
        if wi.quantity <= 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Quantidade deve ser maior que zero para o item '{item.description}'."
            )
        remaining = item.quantity - (item.quantity_withdrawn or 0)
        if wi.quantity > remaining:
            raise HTTPException(
                status_code=400, 
                detail=f"Quantidade solicitada ({wi.quantity}) excede o restante ({remaining}) do item '{item.description}'."
            )
    
    # 4. Check if this is a partial withdrawal (not all items fully withdrawn after this)
    active_items = [i for i in purchase.items if i.status != 'cancelled']
    for item in active_items:
        matched = next((wi for wi in withdrawal.items if wi.item_id == item.id), None)
        qty_after = (item.quantity_withdrawn or 0) + (matched.quantity if matched else 0)
        if qty_after < item.quantity:
            is_partial = True
            break
    
    # Also partial if not all active items are in the withdrawal
    withdrawn_item_ids = {wi.item_id for wi in withdrawal.items}
    for item in active_items:
        if item.id not in withdrawn_item_ids and (item.quantity_withdrawn or 0) < item.quantity:
            is_partial = True
            break
    
    # 5. Validate observation for partial withdrawal
    if is_partial and not (withdrawal.observation and withdrawal.observation.strip()):
        raise HTTPException(
            status_code=400, 
            detail="Observação é obrigatória para retiradas parciais."
        )
    
    # 6. Create withdrawal record
    db_withdrawal = models.PurchaseWithdrawal(
        purchase_id=id,
        user_id=current_user.id,
        observation=withdrawal.observation
    )
    db.add(db_withdrawal)
    await db.flush()  # Get the ID
    
    # 7. Create withdrawal items and update accumulators
    created_items = []
    for wi in withdrawal.items:
        db_wi = models.PurchaseWithdrawalItem(
            withdrawal_id=db_withdrawal.id,
            item_id=wi.item_id,
            quantity_withdrawn=wi.quantity
        )
        db.add(db_wi)
        created_items.append((wi, db_wi))
        
        # Update accumulator on the item
        item = items_map[wi.item_id]
        item.quantity_withdrawn = (item.quantity_withdrawn or 0) + wi.quantity
        
        # If fully withdrawn, update item status to 'delivered'
        if (item.quantity_withdrawn or 0) >= item.quantity:
            item.status = 'delivered'
    
    # 8. Recalculate purchase status
    recalculate_purchase_status(purchase)
    
    await db.commit()
    
    # 9. Build response
    for _, db_wi in created_items:
        await db.refresh(db_wi)
    
    # Load user info for response
    user_name = None
    if current_user.collaborator:
        user_name = current_user.collaborator.name
    else:
        user_name = current_user.email
    
    return schemas.WithdrawalResponse(
        id=db_withdrawal.id,
        purchase_id=db_withdrawal.purchase_id,
        user_name=user_name,
        observation=db_withdrawal.observation,
        created_at=db_withdrawal.created_at,
        items=[
            schemas.WithdrawalItemResponse(
                id=db_wi.id,
                item_id=wi.item_id,
                item_description=items_map[wi.item_id].description,
                quantity_withdrawn=wi.quantity
            )
            for wi, db_wi in created_items
        ]
    )



@router.get("/purchases/{id}/withdrawals", response_model=List[schemas.WithdrawalResponse])
async def get_purchase_withdrawals(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get the withdrawal history for a purchase request."""
    
    # Verify purchase exists
    result = await db.execute(
        select(models.PurchaseRequest).where(models.PurchaseRequest.id == id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Pedido de compra não encontrado.")
    
    # Load withdrawals with items and user
    result = await db.execute(
        select(models.PurchaseWithdrawal)
        .options(
            selectinload(models.PurchaseWithdrawal.items).selectinload(models.PurchaseWithdrawalItem.item),
            selectinload(models.PurchaseWithdrawal.user).selectinload(User.collaborator)
        )
        .where(models.PurchaseWithdrawal.purchase_id == id)
        .order_by(models.PurchaseWithdrawal.created_at.desc())
    )
    withdrawals = result.scalars().all()
    
    response = []
    for w in withdrawals:
        user_name = None
        if w.user and w.user.collaborator:
            user_name = w.user.collaborator.name
        elif w.user:
            user_name = w.user.email
        
        response.append(schemas.WithdrawalResponse(
            id=w.id,
            purchase_id=w.purchase_id,
            user_name=user_name,
            observation=w.observation,
            created_at=w.created_at,
            items=[
                schemas.WithdrawalItemResponse(
                    id=wi.id,
                    item_id=wi.item_id,
                    item_description=wi.item.description if wi.item else None,
                    quantity_withdrawn=wi.quantity_withdrawn
                )
                for wi in w.items
            ]
        ))
    
    return response

# ================================
# OBSERVATION CHAT ENDPOINTS
# ================================

@router.post("/purchases/{id}/observations", response_model=schemas.PurchaseObservationResponse)
async def create_purchase_observation(
    id: int, 
    observation: schemas.PurchaseObservationCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(models.PurchaseRequest).where(models.PurchaseRequest.id == id))
    purchase = result.scalar_one_or_none()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase request not found")

    db_obs = models.PurchaseObservation(
        purchase_id=id,
        user_id=current_user.id,
        message=observation.message
    )
    db.add(db_obs)
    await db.commit()
    await db.refresh(db_obs)
    
    # Reload with relations
    query = select(models.PurchaseObservation).options(
        selectinload(models.PurchaseObservation.user).selectinload(User.collaborator)
    ).where(models.PurchaseObservation.id == db_obs.id)
    result = await db.execute(query)
    db_obs = result.scalar_one()
    
    return {
        "id": db_obs.id,
        "purchase_id": db_obs.purchase_id,
        "user_id": db_obs.user_id,
        "message": db_obs.message,
        "created_at": db_obs.created_at,
        "user_name": db_obs.user.collaborator.name if db_obs.user and hasattr(db_obs.user, 'collaborator') and db_obs.user.collaborator else (db_obs.user.email if db_obs.user else None)
    }
