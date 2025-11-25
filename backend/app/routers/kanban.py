from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models import kanban as models
from app.schemas import kanban as schemas

router = APIRouter()

@router.get("/tasks", response_model=List[schemas.TaskResponse])
async def get_tasks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Task))
    tasks = result.scalars().all()
    return tasks

@router.post("/tasks", response_model=schemas.TaskResponse)
async def create_task(task: schemas.TaskCreate, db: AsyncSession = Depends(get_db)):
    db_task = models.Task(**task.model_dump())
    db.add(db_task)
    await db.commit()
    await db.refresh(db_task)
    return db_task

@router.put("/tasks/{task_id}", response_model=schemas.TaskResponse)
async def update_task(task_id: int, task: schemas.TaskCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Task).where(models.Task.id == task_id))
    db_task = result.scalar_one_or_none()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    for key, value in task.model_dump().items():
        setattr(db_task, key, value)
    
    await db.commit()
    await db.refresh(db_task)
    return db_task

@router.delete("/tasks/{task_id}")
async def delete_task(task_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Task).where(models.Task.id == task_id))
    db_task = result.scalar_one_or_none()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await db.delete(db_task)
    await db.commit()
    return {"message": "Task deleted"}
