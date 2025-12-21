from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from app.database import get_db
from app.models import teams as models
from app.models import operational as op_models
from app.models.collaborator_teams import collaborator_teams
from app.schemas import teams as schemas

router = APIRouter()

@router.get("/teams", response_model=List[schemas.TeamResponse])
async def get_teams(db: AsyncSession = Depends(get_db)):
    # Fetch teams
    result = await db.execute(select(models.Team))
    teams = result.scalars().all()
    
    response = []
    for team in teams:
        # Get Leader Name
        leader_name = None
        if team.leader_id:
            leader_res = await db.execute(select(op_models.Collaborator).where(op_models.Collaborator.id == team.leader_id))
            leader = leader_res.scalar_one_or_none()
            if leader:
                leader_name = leader.name
        
        # Get Member Count using N:N relationship
        count_res = await db.execute(
            select(func.count())
            .select_from(collaborator_teams)
            .where(collaborator_teams.c.team_id == team.id)
        )
        member_count = count_res.scalar() or 0
        
        response.append(schemas.TeamResponse(
            id=team.id,
            name=team.name,
            description=team.description,
            leader_id=team.leader_id,
            leader_name=leader_name,
            member_count=member_count
        ))
    return response

@router.post("/teams", response_model=schemas.TeamResponse)
async def create_team(team: schemas.TeamCreate, db: AsyncSession = Depends(get_db)):
    db_team = models.Team(**team.model_dump())
    db.add(db_team)
    await db.commit()
    await db.refresh(db_team)
    
    # Leader logic if assigned?
    leader_name = None
    if db_team.leader_id:
        leader_res = await db.execute(select(op_models.Collaborator).where(op_models.Collaborator.id == db_team.leader_id))
        leader = leader_res.scalar_one_or_none()
        if leader:
            leader_name = leader.name
            
    return schemas.TeamResponse(
        id=db_team.id,
        name=db_team.name,
        description=db_team.description,
        leader_id=db_team.leader_id,
        leader_name=leader_name,
        member_count=0
    )

@router.put("/teams/{team_id}", response_model=schemas.TeamResponse)
async def update_team(team_id: int, team_data: schemas.TeamUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Team).where(models.Team.id == team_id))
    db_team = result.scalar_one_or_none()
    if not db_team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    for key, value in team_data.model_dump(exclude_unset=True).items():
        setattr(db_team, key, value)
    
    await db.commit()
    await db.refresh(db_team)
    
    # Fetch computed fields
    leader_name = None
    if db_team.leader_id:
         leader_res = await db.execute(select(op_models.Collaborator).where(op_models.Collaborator.id == db_team.leader_id))
         leader = leader_res.scalar_one_or_none()
         if leader:
             leader_name = leader.name

    # Get member count using N:N relationship
    count_res = await db.execute(
        select(func.count())
        .select_from(collaborator_teams)
        .where(collaborator_teams.c.team_id == db_team.id)
    )
    member_count = count_res.scalar() or 0

    return schemas.TeamResponse(
        id=db_team.id,
        name=db_team.name,
        description=db_team.description,
        leader_id=db_team.leader_id,
        leader_name=leader_name,
        member_count=member_count
    )

@router.delete("/teams/{team_id}")
async def delete_team(team_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Team).where(models.Team.id == team_id))
    db_team = result.scalar_one_or_none()
    if not db_team:
        raise HTTPException(status_code=404, detail="Team not found")
        
    # Note: N:N relationship will auto-delete from junction table due to cascade
    # No need to manually unassign members
        
    await db.delete(db_team)
    await db.commit()
    return {"message": "Team deleted"}
