from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from app.database import get_db
from app.models import operational as models
from app.schemas import operational as schemas
from app.auth import get_current_active_user
from app.models.users import User

router = APIRouter()

async def sync_project_resource_after_allocation_change(project_id: int, resource_type: str, resource_id: int, db: AsyncSession):
    from sqlalchemy import select, func, delete
    from app.models.project_resources import ProjectCollaborator, ProjectVehicle, ProjectTool
    
    if not project_id or not resource_id:
        return

    # Check remaining allocations
    stmt = select(
        func.min(models.Allocation.date).label("min_date"),
        func.max(models.Allocation.date).label("max_date"),
        func.count(models.Allocation.id).label("count")
    ).where(
        models.Allocation.project_id == project_id,
        models.Allocation.resource_type == resource_type,
        models.Allocation.resource_id == resource_id
    )
    
    result = await db.execute(stmt)
    stats = result.first()
    count = stats.count if stats else 0
    min_date = stats.min_date if stats else None
    max_date = stats.max_date if stats else None

    if resource_type == "PERSON":
        model = ProjectCollaborator
        res_col = "collaborator_id"
    elif resource_type == "CAR":
        model = ProjectVehicle
        res_col = "vehicle_id"
    elif resource_type == "TOOL":
        model = ProjectTool
        res_col = "tool_id"
    else:
        return

    if count == 0:
        # Delete link
        await db.execute(delete(model).where(
            model.project_id == project_id,
            getattr(model, res_col) == resource_id
        ))
    else:
        # Update dates
        res = await db.execute(select(model).where(
            model.project_id == project_id,
            getattr(model, res_col) == resource_id
        ))
        item = res.scalar_one_or_none()
        if item:
            item.start_date = min_date
            item.end_date = max_date
            db.add(item)

# Allocations
@router.get("/allocations", response_model=List[schemas.AllocationResponse])
async def get_allocations(
    team_ids: List[int] = Query(None, description="Filter by team IDs"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from app.models.teams import Team
    from app.models.collaborator_teams import collaborator_teams
    
    # Permission Check: Filter allowed teams for non-superusers
    from app.auth import check_permission
    has_collaborators_read_all = check_permission(current_user, 'collaborators', 'read_all')

    allowed_team_ids = None
    if not current_user.is_superuser and not has_collaborators_read_all:
        if not current_user.collaborator_id:
            # Not a collaborator, sees nothing (or only non-person resources if we decide)
             return [] # Or return empty list of allocations
             
        # Find teams where user is member OR leader
        # 1. Member
        stmt_member = select(collaborator_teams.c.team_id).where(collaborator_teams.c.collaborator_id == current_user.collaborator_id)
        result_member = await db.execute(stmt_member)
        member_ids = set(result_member.scalars().all())
        
        # 2. Leader
        stmt_leader = select(Team.id).where(Team.leader_id == current_user.collaborator_id)
        result_leader = await db.execute(stmt_leader)
        leader_ids = set(result_leader.scalars().all())
        
        allowed_ids = member_ids.union(leader_ids)
        
        if not allowed_ids:
            # User belongs to NO teams. Only shared resources (Cars/Tools) might be visible?
            # If we pass empty list to IN clause, it matches nothing.
            # But the logic below handles "OR resource_type != PERSON".
            # So if we force team_ids=[] (empty filter), it might mean "No teams".
            allowed_team_ids = []
        else:
            allowed_team_ids = list(allowed_ids)
            
        # Apply restriction
        if team_ids:
            # User wants specific teams. Intersect with allowed.
            team_ids = [tid for tid in team_ids if tid in allowed_team_ids]
            if not team_ids:
                 # If intersection is empty, it means they asked for teams they can't see.
                 # Return empty for PERSON, keeping logic for CAR/TOOL active below?
                 # If we pass an empty list to the query below, we need to ensure it handles it.
                 # Logic below: (collaborator_teams.c.team_id.in_(team_ids))
                 # If team_ids is empty list, .in_([]) is usually false.
                 # So it will match NO Persons. Perfect.
                 pass
        else:
            # User didn't specify. Restrict to ALL allowed.
            team_ids = allowed_team_ids
            # Note: If allowed_team_ids is empty, team_ids is empty.
    
    # Logic to build query
    if team_ids is not None:
        # If team_ids is provided (or forced by permission logic)
        # We perform the filtering
        
        # If team_ids is empty list (user has no teams), we still want to show CAR/TOOL?
        # Yes, standard behavior.
        
        stmt = (
            select(models.Allocation)
            .distinct()
            .outerjoin(
                models.Collaborator,
                (models.Allocation.resource_type == 'PERSON') & 
                (models.Allocation.resource_id == models.Collaborator.id)
            )
            .outerjoin(
                collaborator_teams,
                models.Collaborator.id == collaborator_teams.c.collaborator_id
            )
            .where(
                # Either it's a PERSON in one of the teams, or it's not a PERSON (CAR/TOOL - show all)
                (collaborator_teams.c.team_id.in_(team_ids)) |
                (models.Allocation.resource_type != 'PERSON')
            )
        )
        result = await db.execute(stmt)
    else:
        # No filter (Superuser ONLY now, as non-superusers force a filter above)
        # return all allocations (Global View)
        result = await db.execute(select(models.Allocation))
    
    allocations = result.scalars().all()
    return allocations

@router.post("/allocations", response_model=List[schemas.AllocationResponse])
async def create_allocation(allocation: schemas.AllocationCreate, db: AsyncSession = Depends(get_db)):
    from datetime import timedelta
    import holidays
    from app.models.project_resources import ProjectCollaborator, ProjectVehicle
    
    br_holidays = holidays.BR()
    created_allocations = []
    
    # 1. Iterate dates
    current_date = allocation.start_date
    while current_date <= allocation.end_date:
        # Check for Weekend/Holiday
        is_weekend = current_date.weekday() >= 5 # 5=Sat, 6=Sun
        is_holiday = current_date in br_holidays
        
        if (is_weekend or is_holiday) and not allocation.include_weekends:
            current_date += timedelta(days=1)
            continue

        # Check if allocation exists for this resource/date?
        # For checks we would need a query. Let's assume we can create (or overlapping allowed).
        # Better: Delete existing for this resource/date if exists?
        # Scheduler usually replaces.
        # Let's delete existing allocation for this resource on this date to avoid duplicates/conflicts
        await db.execute(
            select(models.Allocation).filter(
                models.Allocation.date == current_date,
                models.Allocation.resource_id == allocation.resource_id,
                models.Allocation.resource_type == allocation.resource_type
            ).execution_options(synchronize_session=False)
        )
        # Note: delete via execute is tricky with async.
        # Easier: Query and delete.
        existing = await db.execute(select(models.Allocation).where(
            models.Allocation.date == current_date,
            models.Allocation.resource_id == allocation.resource_id,
            models.Allocation.resource_type == allocation.resource_type
        ))
        for row in existing.scalars().all():
            await db.delete(row)
            
        new_alloc = models.Allocation(
            date=current_date,
            resource_type=allocation.resource_type,
            resource_id=allocation.resource_id,
            description=allocation.description,
            type=allocation.type,
            project_id=allocation.project_id,
            contract_id=allocation.contract_id
            # status? Model doesn't seem to have status in lines 34-51 of operational.py view!
            # Schema added status="CONFIRMED". I need to check if Model has status.
            # Step 827 view shows NO status column in Allocation model.
            # Only `type` (Reservation/Justification).
            # So I skip status.
        )
        db.add(new_alloc)
        created_allocations.append(new_alloc)
        current_date += timedelta(days=1)
    
    # If no valid days were created (e.g. only weekends selected), skip link creation
    if not created_allocations:
        return []
        
    # 2. Link to Project
    if allocation.project_id:
        if allocation.resource_type == "PERSON":
            # Check if exists
            q = select(ProjectCollaborator).where(
                ProjectCollaborator.project_id == allocation.project_id,
                ProjectCollaborator.collaborator_id == allocation.resource_id
            )
            res = await db.execute(q)
            pc = res.scalars().first()
            
            if not pc:

                # Create default entry
                pc = ProjectCollaborator(
                    project_id=allocation.project_id,
                    collaborator_id=allocation.resource_id,
                    role="Alocado via Scheduler",
                    start_date=allocation.start_date,
                    end_date=allocation.end_date,
                    status="active"
                )
                db.add(pc)
            else:
                # Update existing if dates expand range
                modified = False
                if pc.start_date and allocation.start_date < pc.start_date:
                    pc.start_date = allocation.start_date
                    modified = True
                if pc.end_date and allocation.end_date > pc.end_date:
                    pc.end_date = allocation.end_date
                    modified = True
                
                if modified:
                    db.add(pc)
                
        elif allocation.resource_type == "CAR":
             # Check if exists
            q = select(ProjectVehicle).where(
                ProjectVehicle.project_id == allocation.project_id,
                ProjectVehicle.vehicle_id == allocation.resource_id
            )
            res = await db.execute(q)
            pv = res.scalars().first()
            
            if not pv:
                pv = ProjectVehicle(
                    project_id=allocation.project_id,
                    vehicle_id=allocation.resource_id,
                    start_date=allocation.start_date,
                    end_date=allocation.end_date
                )
                db.add(pv)
        elif allocation.resource_type == "TOOL":
            from app.models.project_resources import ProjectTool
            q = select(ProjectTool).where(
                ProjectTool.project_id == allocation.project_id,
                ProjectTool.tool_id == allocation.resource_id
            )
            res = await db.execute(q)
            pt = res.scalars().first()
            if not pt:
                pt = ProjectTool(
                    project_id=allocation.project_id,
                    tool_id=allocation.resource_id,
                    start_date=allocation.start_date,
                    end_date=allocation.end_date
                )
                db.add(pt)

    await db.commit()
    return created_allocations

@router.post("/allocations/batch-delete")
async def batch_delete_allocations(payload: dict, db: AsyncSession = Depends(get_db)):
    """
    Batch delete allocations by IDs.
    Expects payload: {"ids": [1, 2, 3]}
    """
    from sqlalchemy import delete
    
    ids = payload.get("ids", [])
    if not ids:
        return {"success": True, "count": 0}

    # Identify affected resources
    result = await db.execute(select(models.Allocation).where(models.Allocation.id.in_(ids)))
    allocs = result.scalars().all()
    affected = set([(a.project_id, a.resource_type, a.resource_id) for a in allocs if a.project_id])

    # Execute delete in a single query
    await db.execute(
        delete(models.Allocation).where(models.Allocation.id.in_(ids))
    )
    await db.flush()

    for p_id, r_type, r_id in affected:
        await sync_project_resource_after_allocation_change(p_id, r_type, r_id, db)
    
    await db.commit()
    return {"success": True, "count": len(ids)}

@router.put("/allocations/{allocation_id}", response_model=List[schemas.AllocationResponse])
async def update_allocation(allocation_id: int, allocation: schemas.AllocationCreate, db: AsyncSession = Depends(get_db)):
    from datetime import timedelta
    import holidays
    from app.models.project_resources import ProjectCollaborator, ProjectVehicle
    br_holidays = holidays.BR()

    # 1. Delete the existing allocation
    result = await db.execute(select(models.Allocation).where(models.Allocation.id == allocation_id))
    db_allocation = result.scalar_one_or_none()
    if db_allocation:
        await db.delete(db_allocation)
        # Check permissions? Assuming open for now.
    else:
        # If not found, maybe just proceed to create? Or 404? 
        # Standard HTTP PUT on ID should 404 if ID missing.
        raise HTTPException(status_code=404, detail="Allocation not found")

    created_allocations = []
    
    # 2. Iterate dates (Same logic as create)
    current_date = allocation.start_date
    while current_date <= allocation.end_date:
        # Check for Weekend/Holiday
        is_weekend = current_date.weekday() >= 5 # 5=Sat, 6=Sun
        is_holiday = current_date in br_holidays
        
        if (is_weekend or is_holiday) and not allocation.include_weekends:
            current_date += timedelta(days=1)
            continue

        # Delete overlaps to avoid duplicates (clean slate approach for the range)
        # Delete overlaps to avoid duplicates (clean slate approach for the range)
        existing = await db.execute(select(models.Allocation).where(
            models.Allocation.date == current_date,
            models.Allocation.resource_id == allocation.resource_id,
            models.Allocation.resource_type == allocation.resource_type
        ))
        for row in existing.scalars().all():
            await db.delete(row)
            
        new_alloc = models.Allocation(
            date=current_date,
            resource_type=allocation.resource_type,
            resource_id=allocation.resource_id,
            description=allocation.description,
            type=allocation.type,
            project_id=allocation.project_id,
            contract_id=allocation.contract_id
        )
        db.add(new_alloc)
        created_allocations.append(new_alloc)
        current_date += timedelta(days=1)

    # If no valid days were created, skip link creation
    if not created_allocations:
        await db.commit()
        return []

    # 3. Link to Project (Same logic)
    if allocation.project_id:
        if allocation.resource_type == "PERSON":
            res = await db.execute(
                select(ProjectCollaborator).where(
                    ProjectCollaborator.project_id == allocation.project_id,
                    ProjectCollaborator.collaborator_id == allocation.resource_id
                )
            )
            pc = res.scalars().first()
            if not pc:
                pc = ProjectCollaborator(
                    project_id=allocation.project_id,
                    collaborator_id=allocation.resource_id,
                    role="Alocado via Scheduler",
                    start_date=allocation.start_date,
                    end_date=allocation.end_date,
                    status="active"
                )
                db.add(pc)
            else:
                # Update existing if dates expand range
                modified = False
                if pc.start_date and allocation.start_date < pc.start_date:
                    pc.start_date = allocation.start_date
                    modified = True
                if pc.end_date and allocation.end_date > pc.end_date:
                    pc.end_date = allocation.end_date
                    modified = True
                
                if modified:
                    db.add(pc)
                
        elif allocation.resource_type == "CAR":
            res = await db.execute(
                select(ProjectVehicle).where(
                    ProjectVehicle.project_id == allocation.project_id,
                    ProjectVehicle.vehicle_id == allocation.resource_id
                )
            )
            pv = res.scalars().first()
            if not pv:
                pv = ProjectVehicle(
                    project_id=allocation.project_id,
                    vehicle_id=allocation.resource_id,
                    start_date=allocation.start_date,
                    end_date=allocation.end_date
                )
                db.add(pv)
        elif allocation.resource_type == "TOOL":
            from app.models.project_resources import ProjectTool
            res = await db.execute(
                select(ProjectTool).where(
                    ProjectTool.project_id == allocation.project_id,
                    ProjectTool.tool_id == allocation.resource_id
                )
            )
            pt = res.scalars().first()
            if not pt:
                pt = ProjectTool(
                    project_id=allocation.project_id,
                    tool_id=allocation.resource_id,
                    start_date=allocation.start_date,
                    end_date=allocation.end_date
                )
                db.add(pt)
    
    await db.flush()
    # Synchronize bounds dynamically after update
    if db_allocation and db_allocation.project_id:
        await sync_project_resource_after_allocation_change(db_allocation.project_id, db_allocation.resource_type, db_allocation.resource_id, db)
    if allocation.project_id:
        await sync_project_resource_after_allocation_change(allocation.project_id, allocation.resource_type, allocation.resource_id, db)

    await db.commit()
    return created_allocations



@router.delete("/allocations/{allocation_id}")
async def delete_allocation(allocation_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Allocation).where(models.Allocation.id == allocation_id))
    db_allocation = result.scalar_one_or_none()
    if not db_allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")
    
    project_id = db_allocation.project_id
    resource_type = db_allocation.resource_type
    resource_id = db_allocation.resource_id

    await db.delete(db_allocation)
    await db.flush()
    
    if project_id:
        await sync_project_resource_after_allocation_change(project_id, resource_type, resource_id, db)

    await db.commit()
    return {"message": "Allocation deleted"}

@router.get("/collaborators", response_model=List[schemas.CollaboratorResponse])
async def get_collaborators(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from app.models.teams import Team
    from app.models.collaborator_teams import collaborator_teams
    
    query = select(models.Collaborator).options(
        selectinload(models.Collaborator.certifications),
        selectinload(models.Collaborator.education),
        selectinload(models.Collaborator.teams)
    )

    from app.auth import check_permission
    has_read_all = check_permission(current_user, 'collaborators', 'read_all')

    if not current_user.is_superuser and not has_read_all:
        if not current_user.collaborator_id:
            return []
            
        # 1. Get Allowed Teams (Member or Leader)
        # Member
        stmt_member = select(collaborator_teams.c.team_id).where(collaborator_teams.c.collaborator_id == current_user.collaborator_id)
        result_member = await db.execute(stmt_member)
        member_ids = set(result_member.scalars().all())
        
        # Leader
        stmt_leader = select(Team.id).where(Team.leader_id == current_user.collaborator_id)
        result_leader = await db.execute(stmt_leader)
        leader_ids = set(result_leader.scalars().all())
        
        allowed_team_ids = member_ids.union(leader_ids)
        
        if allowed_team_ids:
             # Show collaborators who are members of these teams OR the user themselves
             # We join with collaborator_teams to filter
             query = query.join(models.Collaborator.teams).where(
                 (models.Collaborator.id == current_user.collaborator_id) |
                 (Team.id.in_(allowed_team_ids))
             ).distinct()
        else:
             # User has no teams. Only show themselves.
             query = query.where(models.Collaborator.id == current_user.collaborator_id)

    result = await db.execute(query)
    collaborators = result.scalars().all()
    return collaborators

@router.post("/collaborators", response_model=schemas.CollaboratorResponse)
async def create_collaborator(collaborator: schemas.CollaboratorCreate, db: AsyncSession = Depends(get_db)):
    from app.models.teams import Team
    from app.models.collaborator_teams import collaborator_teams as ct_table
    
    # Extract team_ids from payload, exclude 'role' (synced from Role table)
    team_ids = collaborator.team_ids
    collaborator_data = collaborator.model_dump(exclude={"team_ids", "role"})
    
    # Create collaborator
    db_collaborator = models.Collaborator(**collaborator_data)
    db.add(db_collaborator)
    await db.flush()  # Get the ID

    # Sync role name from Role table
    if db_collaborator.role_id:
        from app.models.roles import Role
        role_result = await db.execute(select(Role).where(Role.id == db_collaborator.role_id))
        role_obj = role_result.scalar_one_or_none()
        if role_obj:
            db_collaborator.role = role_obj.name
    else:
        db_collaborator.role = None
    
    # Add teams via junction table (avoids lazy-load issue with async)
    if team_ids:
        for tid in team_ids:
            await db.execute(ct_table.insert().values(
                collaborator_id=db_collaborator.id, team_id=tid
            ))
    
    await db.commit()
    await db.refresh(db_collaborator, attribute_names=["teams", "certifications", "education"])
    return db_collaborator


@router.put("/collaborators/{collaborator_id}", response_model=schemas.CollaboratorResponse)
async def update_collaborator(collaborator_id: int, collaborator: schemas.CollaboratorCreate, db: AsyncSession = Depends(get_db)):
    from app.models.teams import Team
    
    result = await db.execute(select(models.Collaborator).options(
        selectinload(models.Collaborator.certifications),
        selectinload(models.Collaborator.education),
        selectinload(models.Collaborator.teams)
    ).where(models.Collaborator.id == collaborator_id))
    db_collaborator = result.scalar_one_or_none()
    if not db_collaborator:
        raise HTTPException(status_code=404, detail="Collaborator not found")
    
    # Extract team_ids from payload, exclude 'role' (synced from Role table)
    team_ids = collaborator.team_ids
    collaborator_data = collaborator.model_dump(exclude={"team_ids", "role"})
    
    # Validation for termination_date
    if collaborator.termination_date and getattr(db_collaborator, 'termination_date', None) != collaborator.termination_date:
        from app.models.commercial import Project
        from app.models.project_resources import ProjectCollaborator
        from sqlalchemy import or_

        active_allocations_query = (
            select(ProjectCollaborator)
            .join(Project, Project.id == ProjectCollaborator.project_id)
            .where(
                ProjectCollaborator.collaborator_id == db_collaborator.id,
                Project.status != "Concluído",
                or_(
                    ProjectCollaborator.end_date >= collaborator.termination_date,
                    ProjectCollaborator.end_date.is_(None)
                )
            )
        )
        active_allocations_result = await db.execute(active_allocations_query)
        if active_allocations_result.scalars().first():
            raise HTTPException(
                status_code=400,
                detail="Não é possível definir esta data de demissão pois o colaborador possui alocações ativas em projetos em andamento nesta data ou posteriormente."
            )

    # Update collaborator attributes
    for key, value in collaborator_data.items():
        setattr(db_collaborator, key, value)

    # Sync role name from Role table
    if db_collaborator.role_id:
        from app.models.roles import Role
        role_result = await db.execute(select(Role).where(Role.id == db_collaborator.role_id))
        role_obj = role_result.scalar_one_or_none()
        if role_obj:
            db_collaborator.role = role_obj.name
    else:
        db_collaborator.role = None
    
    # Update teams (replace all)
    if team_ids is not None:
        result = await db.execute(select(Team).where(Team.id.in_(team_ids)))
        teams = result.scalars().all()
        db_collaborator.teams = teams
    else:
        db_collaborator.teams = []
    
    await db.commit()
    await db.refresh(db_collaborator, attribute_names=["teams", "certifications", "education"])
    return db_collaborator

@router.delete("/collaborators/{collaborator_id}")
async def delete_collaborator(collaborator_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Collaborator).where(models.Collaborator.id == collaborator_id))
    db_collaborator = result.scalar_one_or_none()
    if not db_collaborator:
        raise HTTPException(status_code=404, detail="Collaborator not found")
    
    await db.delete(db_collaborator)
    await db.commit()
    return {"message": "Collaborator deleted"}

# Certifications
@router.get("/certifications/{collaborator_id}", response_model=List[schemas.CertificationResponse])
async def get_certifications(collaborator_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Certification).where(models.Certification.collaborator_id == collaborator_id))
    certifications = result.scalars().all()
    return certifications

@router.post("/certifications", response_model=schemas.CertificationResponse)
async def create_certification(certification: schemas.CertificationCreate, db: AsyncSession = Depends(get_db)):
    db_certification = models.Certification(**certification.model_dump())
    db.add(db_certification)
    await db.commit()
    await db.refresh(db_certification)
    return db_certification

@router.delete("/certifications/{certification_id}")
async def delete_certification(certification_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Certification).where(models.Certification.id == certification_id))
    db_certification = result.scalar_one_or_none()
    if not db_certification:
        raise HTTPException(status_code=404, detail="Certification not found")
    
    await db.delete(db_certification)
    await db.commit()
    return {"message": "Certification deleted"}

# Education
@router.get("/education/{collaborator_id}", response_model=List[schemas.CollaboratorEducationResponse])
async def get_education(collaborator_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.CollaboratorEducation).where(models.CollaboratorEducation.collaborator_id == collaborator_id))
    education_items = result.scalars().all()
    return education_items

@router.post("/education", response_model=schemas.CollaboratorEducationResponse)
async def create_education(education: schemas.CollaboratorEducationCreate, db: AsyncSession = Depends(get_db)):
    db_education = models.CollaboratorEducation(**education.model_dump())
    db.add(db_education)
    await db.commit()
    await db.refresh(db_education)
    return db_education

@router.delete("/education/{education_id}")
async def delete_education(education_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.CollaboratorEducation).where(models.CollaboratorEducation.id == education_id))
    db_education = result.scalar_one_or_none()
    if not db_education:
        raise HTTPException(status_code=404, detail="Education item not found")
    
    await db.delete(db_education)
    await db.commit()
    return {"message": "Education item deleted"}

# Review / Performance
@router.get("/reviews/{collaborator_id}", response_model=List[schemas.CollaboratorReviewResponse])
async def get_reviews(collaborator_id: int, db: AsyncSession = Depends(get_db)):
    from app.models.users import User
    
    # Join with User then Collaborator to get the Reviewer's Name (Performance/UX Requirement)
    # If the reviewer User is not linked to a collaborator, we might need a fallback?
    # For now, let's left join user and then join collaborator.
    
    stmt = (
        select(models.CollaboratorReview, models.Collaborator.name.label("reviewer_name"))
        .join(User, models.CollaboratorReview.reviewer_id == User.id)
        .outerjoin(models.Collaborator, User.collaborator_id == models.Collaborator.id)
        .where(models.CollaboratorReview.collaborator_id == collaborator_id)
        .order_by(models.CollaboratorReview.date.desc())
    )
    
    result = await db.execute(stmt)
    reviews_data = []
    for review, reviewer_name in result.all():
        # Inject the resolved name into the response object (Pydantic will handle it if we modify the dict or object)
        # Since 'review' is an ORM object, we can't easily add attributes that aren't columns.
        # But we can convert to dict/schema.
        
        # Helper to construct response
        review_dict = {
            "id": review.id,
            "collaborator_id": review.collaborator_id,
            "reviewer_id": review.reviewer_id,
            "date": review.date,
            "score_technical": review.score_technical,
            "score_safety": review.score_safety,
            "score_punctuality": review.score_punctuality,
            "comments": review.comments,
            "reviewer_name": reviewer_name or "Desconhecido" # Fallback if no collaborator linked
        }
        reviews_data.append(review_dict)
        
    return reviews_data

@router.post("/reviews", response_model=schemas.CollaboratorReviewResponse)
async def create_review(
    review: schemas.CollaboratorReviewCreate, 
    current_user: User = Depends(get_current_active_user), 
    db: AsyncSession = Depends(get_db)
):
    db_review = models.CollaboratorReview(
        **review.model_dump(),
        reviewer_id=current_user.id
    )
    
    db.add(db_review)
    await db.commit()
    await db.refresh(db_review)
    return db_review

@router.get("/performance/{collaborator_id}", response_model=schemas.CollaboratorPerformanceStats)
async def get_performance_stats(collaborator_id: int, db: AsyncSession = Depends(get_db)):
    from datetime import datetime, timedelta
    from sqlalchemy import func
    
    # 1. Calculate Date Range (Last 12 Months)
    one_year_ago = datetime.now().date() - timedelta(days=365)
    
    # 2. Query for averages
    stmt = (
        select(
            func.avg(models.CollaboratorReview.score_technical).label("avg_tech"),
            func.avg(models.CollaboratorReview.score_safety).label("avg_safety"),
            func.avg(models.CollaboratorReview.score_punctuality).label("avg_punct"),
            func.count(models.CollaboratorReview.id).label("total")
        )
        .where(models.CollaboratorReview.collaborator_id == collaborator_id)
        .where(models.CollaboratorReview.date >= one_year_ago)
    )
    
    result = await db.execute(stmt)
    stats = result.first()
    
    total = stats.total or 0
    if total == 0:
        return {
            "avg_technical": 0,
            "avg_safety": 0,
            "avg_punctuality": 0,
            "avg_general": 0,
            "total_reviews": 0
        }
        
    avg_tech = float(stats.avg_tech or 0)
    avg_safety = float(stats.avg_safety or 0)
    avg_punct = float(stats.avg_punct or 0)
    
    # General Average (Simple Mean of the 3 criteria)
    avg_general = (avg_tech + avg_safety + avg_punct) / 3
    
    return {
        "avg_technical": round(avg_tech, 1),
        "avg_safety": round(avg_safety, 1),
        "avg_punctuality": round(avg_punct, 1),
        "avg_general": round(avg_general, 1),
        "total_reviews": total
    }

@router.delete("/reviews/{review_id}")
async def delete_review(review_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.CollaboratorReview).where(models.CollaboratorReview.id == review_id))
    db_review = result.scalar_one_or_none()
    if not db_review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    await db.delete(db_review)
    await db.commit()
    return {"message": "Review deleted"}
