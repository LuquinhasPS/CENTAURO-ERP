from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models import roles as models
from app.schemas import roles as schemas

router = APIRouter()

@router.get("/roles", response_model=List[schemas.RoleResponse])
async def get_roles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Role))
    return result.scalars().all()

@router.post("/roles", response_model=schemas.RoleResponse)
async def create_role(role: schemas.RoleCreate, db: AsyncSession = Depends(get_db)):
    db_role = models.Role(**role.model_dump())
    db.add(db_role)
    await db.commit()
    await db.refresh(db_role)
    return db_role

@router.put("/roles/{role_id}", response_model=schemas.RoleResponse)
async def update_role(role_id: int, role: schemas.RoleCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Role).where(models.Role.id == role_id))
    db_role = result.scalar_one_or_none()
    if not db_role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    for key, value in role.model_dump().items():
        setattr(db_role, key, value)
    
    await db.commit()
    await db.refresh(db_role)
    return db_role

@router.delete("/roles/{role_id}")
async def delete_role(role_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Role).where(models.Role.id == role_id))
    db_role = result.scalar_one_or_none()
    if not db_role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    await db.delete(db_role)
    await db.commit()
    return {"message": "Role deleted"}

@router.post("/roles/seed")
async def seed_roles(db: AsyncSession = Depends(get_db)):
    """Populate initial roles"""
    initial_roles = [
        {"name": "Coordenador", "description": "Coordenador de projetos"},
        {"name": "Analista", "description": "Analista técnico"},
        {"name": "Técnico", "description": "Técnico de campo"},
        {"name": "Auxiliar", "description": "Auxiliar técnico"},
        {"name": "Assistente", "description": "Assistente administrativo"},
        {"name": "Supervisor", "description": "Supervisor de equipe"},
    ]
    
    created_roles = []
    for role_data in initial_roles:
        # Check if role already exists
        result = await db.execute(select(models.Role).where(models.Role.name == role_data["name"]))
        existing = result.scalar_one_or_none()
        
        if not existing:
            db_role = models.Role(**role_data)
            db.add(db_role)
            created_roles.append(role_data["name"])
    
    await db.commit()
    return {"message": f"Created {len(created_roles)} roles", "roles": created_roles}
