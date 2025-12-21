from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List
import pandas as pd
import io
from datetime import date
from decimal import Decimal

from app.database import get_db
from app.models import finance_payroll as models
from app.models import operational as op_models
from app.models import commercial as com_models # For loading Project name
from app.schemas import finance_payroll as schemas

router = APIRouter()

@router.post("/finance/payroll/upload", response_model=schemas.PayrollUploadSummary)
async def upload_payroll(
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db)
):
    # 1. Read Excel with Pandas
    content = await file.read()
    try:
        # Assuming header is row 0
        df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Excel file: {str(e)}")

    # 2. Extract Data (Assuming known columns or indices)
    # User Request: Matrícula (Col G -> index 6), Total Cost (Col D -> index 3)
    # Let's check columns presence or use indices strictly.
    # User said: "Ler colunas específicas pelo índice (Coluna G e D)"
    # G is the 7th letter (Index 6), D is the 4th letter (Index 3).
    
    processed_records = []
    total_allocated = Decimal(0)
    total_unallocated = Decimal(0)
    
    # Identify Competence Date from filename or input? 
    # For now, let's assume current month or find a date in the file?
    # User Request: "competence_date: Date (Dia 01 do Mês)." 
    # Usually passed as param or derived. Let's start with TODAY's month first day as default 
    # OR maybe the user wants to pass it.
    # Let's look for a date in the dataframe or default to current month.
    today = date.today()
    competence_date = date(today.year, today.month, 1)

    # Clean existing data for this competence to avoid duplicates?
    # Ideally yes.
    # For MVP, we proceed.
    
    # Cache collaborators for speed
    collab_result = await db.execute(select(op_models.Collaborator))
    all_collabs = collab_result.scalars().all()
    # Map registration_number -> Collaborator
    collab_map = {str(c.registration_number): c for c in all_collabs if c.registration_number}
    
    # Prepare date range for queries
    import calendar
    last_day = calendar.monthrange(competence_date.year, competence_date.month)[1]
    start_date = competence_date
    end_date = date(competence_date.year, competence_date.month, last_day)

    for index, row in df.iterrows():
        # Skip empty rows or header artifacts if pandas didn't catch them
        if index < 0: continue 
        
        try:
            # Using iloc for robust index access
            # D = 3, G = 6
            raw_cost = row.iloc[3]
            raw_registration = row.iloc[6]
            
            if pd.isna(raw_registration) or pd.isna(raw_cost):
                continue
                
            registration_number = str(raw_registration).strip().replace(".0", "") # Handle float conversions often happening in pandas
            
            # Convert cost to Decimal
            try:
                total_cost = Decimal(str(raw_cost))
            except:
                continue # Skip invalid cost
                
            collaborator = collab_map.get(registration_number)
            
            if not collaborator:
                # Log warning or skip?
                # Create a temporary record or skip?
                # skipping for now, but in real world we'd report this.
                continue
            # Deduplication: Check if record exists for this collaborator + competence
            # If so, delete it (Cascade will remove ProjectLaborCosts)
            existing_stmt = select(models.MonthlyLaborCost).where(
                and_(
                    models.MonthlyLaborCost.collaborator_id == collaborator.id,
                    models.MonthlyLaborCost.competence_date == competence_date
                )
            )
            existing_result = await db.execute(existing_stmt)
            existing_record = existing_result.scalar_one_or_none()
            
            if existing_record:
                await db.delete(existing_record)
                await db.flush() # Ensure deletion happens before new insertion

            # 3. Query Allocations
            stmt = (
                select(op_models.Allocation.project_id, func.count(op_models.Allocation.id).label("days"))
                .where(
                    and_(
                        op_models.Allocation.resource_type == "PERSON",
                        op_models.Allocation.resource_id == collaborator.id,
                        op_models.Allocation.date >= start_date,
                        op_models.Allocation.date <= end_date,
                        op_models.Allocation.project_id.isnot(None) 
                    )
                )
                .group_by(op_models.Allocation.project_id)
            )
            
            alloc_result = await db.execute(stmt)
            allocations = alloc_result.all() # [(project_id, days), ...]
            
            total_days = sum(a.days for a in allocations)
            
            # 4. Math & Distribution
            unallocated = Decimal(0)
            daily_rate = Decimal(0)
            
            if total_days > 0:
                daily_rate = total_cost / Decimal(total_days)
            else:
                unallocated = total_cost
            
            # 5. Create MonthlyLaborCost
            monthly_record = models.MonthlyLaborCost(
                collaborator_id=collaborator.id,
                competence_date=competence_date,
                total_cost=total_cost,
                total_days_found=total_days,
                calculated_daily_rate=daily_rate,
                unallocated_cost=unallocated
            )
            db.add(monthly_record)
            await db.flush() # Get ID
            
            # 6. Create ProjectLaborCost entries
            project_costs_response = []
            
            for proj_id, days in allocations:
                cost_val = daily_rate * Decimal(days)
                
                proj_cost = models.ProjectLaborCost(
                    monthly_cost_id=monthly_record.id,
                    project_id=proj_id,
                    days_worked=days,
                    cost_value=cost_val
                )
                db.add(proj_cost)
                
                # Fetch project name for response
                p_res = await db.execute(select(com_models.Project).where(com_models.Project.id == proj_id))
                project = p_res.scalar_one_or_none()
                p_name = project.name if project else "Unknown"
                
                project_costs_response.append(
                    schemas.ProjectLaborCostResponse(
                        id=0, # Placeholder, real ID after commit
                        project_id=proj_id,
                        project_name=p_name,
                        days_worked=days,
                        cost_value=cost_val
                    )
                )
                
            total_allocated += (total_cost - unallocated)
            total_unallocated += unallocated
            
            # Build Response Object
            processed_records.append(
                schemas.MonthlyLaborCostResponse(
                    id=monthly_record.id,
                    collaborator_id=collaborator.id,
                    collaborator_name=collaborator.name,
                    registration_number=registration_number,
                    competence_date=competence_date,
                    total_cost=total_cost,
                    total_days_found=total_days,
                    calculated_daily_rate=daily_rate,
                    unallocated_cost=unallocated,
                    project_costs=project_costs_response
                )
            )
            
        except Exception as e:
            print(f"Error processing row {index}: {e}")
            continue

    await db.commit()
    
    return schemas.PayrollUploadSummary(
        total_processed=len(processed_records),
        total_allocated_cost=total_allocated,
        total_unallocated_cost=total_unallocated,
        details=processed_records
    )
