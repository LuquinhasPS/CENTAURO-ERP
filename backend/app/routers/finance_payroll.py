from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, distinct
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
    month: int = Form(...),
    year: int = Form(...),
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db)
):
    # 1. Read Excel with Pandas
    content = await file.read()
    try:
        # Determine engine based on file extension
        filename = file.filename or ""
        if filename.endswith('.xls') and not filename.endswith('.xlsx'):
            engine = 'xlrd'
        else:
            engine = 'openpyxl'
        # Assuming header is row 0
        df = pd.read_excel(io.BytesIO(content), engine=engine)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Excel file: {str(e)}")

    # 2. Extract Data (Assuming known columns or indices)
    # User Request: Matrícula (Col G -> index 6), Total Cost (Col D -> index 3)
    
    processed_records = []
    total_allocated = Decimal(0)
    total_unallocated = Decimal(0)
    
    competence_date = date(year, month, 1)

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

@router.get("/finance/payroll/periods", response_model=List[date])
async def get_payroll_periods(db: AsyncSession = Depends(get_db)):
    """Return a list of distinct competence dates available in the system."""
    stmt = select(distinct(models.MonthlyLaborCost.competence_date)).order_by(desc(models.MonthlyLaborCost.competence_date))
    result = await db.execute(stmt)
    dates = result.scalars().all()
    return dates

@router.get("/finance/payroll/details", response_model=schemas.PayrollUploadSummary)
async def get_payroll_details(
    month: int = Query(...),
    year: int = Query(...),
    db: AsyncSession = Depends(get_db)
):
    competence_date = date(year, month, 1)
    
    # 1. Fetch MonthlyLaborCost records for this date
    # We need to eager load the project_costs and collaborator to build the response
    from sqlalchemy.orm import selectinload
    
    stmt = (
        select(models.MonthlyLaborCost)
        .options(
            selectinload(models.MonthlyLaborCost.project_costs).selectinload(models.ProjectLaborCost.project),
            selectinload(models.MonthlyLaborCost.collaborator)
        )
        .where(models.MonthlyLaborCost.competence_date == competence_date)
    )
    
    result = await db.execute(stmt)
    records = result.scalars().all()
    
    processed_records = []
    total_allocated = Decimal(0)
    total_unallocated = Decimal(0)
    
    for rec in records:
        # Build project costs response list
        p_costs = []
        rec_allocated = Decimal(0)
        
        for pc in rec.project_costs:
            p_costs.append(schemas.ProjectLaborCostResponse(
                id=pc.id,
                project_id=pc.project_id,
                project_name=pc.project.name if pc.project else "Unknown",
                days_worked=pc.days_worked,
                cost_value=pc.cost_value
            ))
            rec_allocated += pc.cost_value
            
        total_allocated += rec_allocated
        total_unallocated += rec.unallocated_cost
        
        # In case we want to re-sum total_cost from DB or re-calc
        # The stored total_cost should be reliable
        
        processed_records.append(schemas.MonthlyLaborCostResponse(
            id=rec.id,
            collaborator_id=rec.collaborator_id,
            collaborator_name=rec.collaborator.name,
            registration_number=rec.collaborator.registration_number,
            competence_date=rec.competence_date,
            total_cost=rec.total_cost,
            total_days_found=rec.total_days_found,
            calculated_daily_rate=rec.calculated_daily_rate,
            unallocated_cost=rec.unallocated_cost,
            project_costs=p_costs
        ))
        
    return schemas.PayrollUploadSummary(
        total_processed=len(processed_records),
        total_allocated_cost=total_allocated,
        total_unallocated_cost=total_unallocated,
        details=processed_records
    )
