from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from app.database import get_db
from app.models import assets as models
from app.schemas import assets as schemas

from app.auth import get_current_active_user, check_permission
from app.models.users import User

router = APIRouter()

# Fleet
@router.get("/fleet", response_model=List[schemas.FleetResponse])
async def get_fleet(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not check_permission(current_user, 'fleet', 'read'):
        return []

    result = await db.execute(select(models.Fleet).options(selectinload(models.Fleet.insurance), selectinload(models.Fleet.maintenances)))
    fleet = result.scalars().all()
    return fleet

@router.post("/fleet", response_model=schemas.FleetResponse)
async def create_fleet_item(
    fleet: schemas.FleetCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not check_permission(current_user, 'fleet', 'write'):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db_fleet = models.Fleet(**fleet.model_dump())
    db.add(db_fleet)
    await db.commit()
    await db.refresh(db_fleet)
    return db_fleet

@router.put("/fleet/{fleet_id}", response_model=schemas.FleetResponse)
async def update_fleet_item(
    fleet_id: int, 
    fleet: schemas.FleetCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not check_permission(current_user, 'fleet', 'write'):
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(select(models.Fleet).options(selectinload(models.Fleet.insurance), selectinload(models.Fleet.maintenances)).where(models.Fleet.id == fleet_id))
    db_fleet = result.scalar_one_or_none()
    if not db_fleet:
        raise HTTPException(status_code=404, detail="Fleet item not found")
    
    for key, value in fleet.model_dump().items():
        setattr(db_fleet, key, value)
    
    await db.commit()
    await db.refresh(db_fleet)
    return db_fleet

@router.delete("/fleet/{fleet_id}")
async def delete_fleet_item(
    fleet_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not check_permission(current_user, 'fleet', 'write'):
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(select(models.Fleet).where(models.Fleet.id == fleet_id))
    fleet = result.scalar_one_or_none()
    if not fleet:
        raise HTTPException(status_code=404, detail="Fleet item not found")
    
    # Delete related records first to avoid foreign key constraints
    from sqlalchemy import delete
    await db.execute(delete(models.VehicleFuelCost).where(models.VehicleFuelCost.vehicle_id == fleet_id))
    await db.execute(delete(models.VehicleMaintenance).where(models.VehicleMaintenance.vehicle_id == fleet_id))
    
    await db.delete(fleet)
    await db.commit()
    return {"message": "Fleet item deleted successfully"}

# Insurance
@router.get("/insurances", response_model=List[schemas.InsuranceResponse])
async def get_insurances(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not check_permission(current_user, 'fleet', 'read'): # Insurance tied to fleet perms usually
         return []

    result = await db.execute(select(models.Insurance))
    insurances = result.scalars().all()
    return insurances

@router.post("/insurances", response_model=schemas.InsuranceResponse)
async def create_insurance(
    insurance: schemas.InsuranceCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not check_permission(current_user, 'fleet', 'write'):
        raise HTTPException(status_code=403, detail="Not authorized")

    db_insurance = models.Insurance(**insurance.model_dump())
    db.add(db_insurance)
    await db.commit()
    await db.refresh(db_insurance)
    return db_insurance

@router.put("/insurances/{insurance_id}", response_model=schemas.InsuranceResponse)
async def update_insurance(
    insurance_id: int, 
    insurance: schemas.InsuranceCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not check_permission(current_user, 'fleet', 'write'):
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(select(models.Insurance).where(models.Insurance.id == insurance_id))
    db_insurance = result.scalar_one_or_none()
    if not db_insurance:
        raise HTTPException(status_code=404, detail="Insurance not found")
    
    for key, value in insurance.model_dump().items():
        setattr(db_insurance, key, value)
    
    await db.commit()
    await db.refresh(db_insurance)
    return db_insurance

@router.delete("/insurances/{insurance_id}")
async def delete_insurance(
    insurance_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not check_permission(current_user, 'fleet', 'write'):
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(select(models.Insurance).where(models.Insurance.id == insurance_id))
    insurance = result.scalar_one_or_none()
    if not insurance:
        raise HTTPException(status_code=404, detail="Insurance not found")
    await db.delete(insurance)
    await db.commit()
    return {"message": "Insurance deleted successfully"}

# Tools
@router.get("/tools", response_model=List[schemas.ToolResponse])
async def get_tools(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not check_permission(current_user, 'tools', 'read'):
        return []

    result = await db.execute(select(models.Tool))
    tools = result.scalars().all()
    return tools

@router.post("/tools", response_model=schemas.ToolResponse)
async def create_tool(tool: schemas.ToolCreate, db: AsyncSession = Depends(get_db)):
    db_tool = models.Tool(**tool.model_dump())
    db.add(db_tool)
    await db.commit()
    await db.refresh(db_tool)
    return db_tool

@router.put("/tools/{tool_id}", response_model=schemas.ToolResponse)
async def update_tool(tool_id: int, tool: schemas.ToolCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Tool).where(models.Tool.id == tool_id))
    db_tool = result.scalar_one_or_none()
    if not db_tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    for key, value in tool.model_dump().items():
        setattr(db_tool, key, value)
    
    await db.commit()
    await db.refresh(db_tool)
    return db_tool

@router.delete("/tools/{tool_id}")
async def delete_tool(tool_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Tool).where(models.Tool.id == tool_id))
    tool = result.scalar_one_or_none()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    await db.delete(tool)
    await db.commit()
    return {"message": "Tool deleted successfully"}


# Fuel Costs
@router.get("/fleet/{vehicle_id}/fuel", response_model=List[schemas.VehicleFuelCostResponse])
async def get_vehicle_fuel_costs(vehicle_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.VehicleFuelCost)
        .where(models.VehicleFuelCost.vehicle_id == vehicle_id)
        .order_by(models.VehicleFuelCost.competence_date.desc())
    )
    return result.scalars().all()


# Helper function to parse fuel spreadsheet
def parse_fuel_spreadsheet(content: bytes, filename: str):
    """Parse fuel spreadsheet and return extracted data without saving"""
    import pandas as pd
    import io
    import re
    from datetime import datetime
    
    # Determine engine based on file extension
    if filename.endswith('.xlsx'):
        engine = 'openpyxl'
    elif filename.endswith('.xls'):
        engine = 'xlrd'
    else:
        engine = 'openpyxl'
    
    # Try to read as Excel first
    try:
        df_header = pd.read_excel(io.BytesIO(content), header=None, nrows=3, engine=engine)
        df = pd.read_excel(io.BytesIO(content), skiprows=5, engine=engine)
        is_html = False
    except Exception as excel_error:
        # If Excel read fails, try HTML (common for web-exported .xls files)
        try:
            tables = pd.read_html(io.BytesIO(content))
            if not tables:
                raise ValueError("Nenhuma tabela encontrada no arquivo")
            df = tables[0]
            df_header = df.head(3)
            is_html = True
        except Exception as html_error:
            raise ValueError(f"Não foi possível ler o arquivo: {str(excel_error)}")
    
    # Extract competence date
    period_cell = ""
    for col_idx in [1, 5, 0]:
        if df_header.shape[1] > col_idx:
            cell_val = str(df_header.iloc[1, col_idx])
            if re.search(r'\d{2}/\d{2}/\d{4}', cell_val):
                period_cell = cell_val
                break
    
    date_match = re.search(r'(\d{2}/\d{2}/\d{4})', period_cell)
    if date_match:
        competence_date = datetime.strptime(date_match.group(1), "%d/%m/%Y").date()
        competence_date = competence_date.replace(day=1)
    else:
        for col_idx in range(min(10, df_header.shape[1])):
            cell_val = str(df_header.iloc[0, col_idx]) if df_header.shape[0] > 0 else ""
            date_match = re.search(r'(\d{2}/\d{2}/\d{4})', cell_val)
            if date_match:
                competence_date = datetime.strptime(date_match.group(1), "%d/%m/%Y").date()
                competence_date = competence_date.replace(day=1)
                break
        else:
            raise ValueError("Não foi possível identificar a data de competência na planilha")
    
    # For HTML files, skip header rows
    if is_html and len(df) > 5:
        df = df.iloc[5:]
    
    # Column indices
    col_placa = 0
    col_ultima_km = 9
    col_km_rodados = 10
    col_litros = 12
    col_total = 16
    
    # Helper functions for Brazilian number format
    # Brazilian format uses . for thousands and , for decimal
    # Examples: 1.607 (one thousand six hundred seven), 156,80 (156.80)
    def safe_int(val):
        if pd.isna(val):
            return None
        try:
            val_str = str(val).strip()
            # Remove any non-numeric characters except . and ,
            # Check if it looks like Brazilian format (has . but is meant as thousands separator)
            if ',' in val_str:
                # Has comma - definitely Brazilian: 1.234,56 -> 1234.56
                val_str = val_str.replace('.', '').replace(',', '.')
            elif '.' in val_str:
                # Has only dot - check if it's thousands separator or decimal
                # If the number after . has exactly 3 digits, it's a thousands separator
                parts = val_str.split('.')
                if len(parts) == 2 and len(parts[1]) == 3:
                    # Brazilian thousands: 1.607 -> 1607
                    val_str = val_str.replace('.', '')
                # Otherwise treat as decimal (e.g., 1.5 stays 1.5)
            return int(float(val_str))
        except:
            return None
    
    def safe_float(val):
        if pd.isna(val):
            return None
        try:
            val_str = str(val).strip()
            if ',' in val_str:
                # Has comma - Brazilian format: 1.234,56 -> 1234.56
                val_str = val_str.replace('.', '').replace(',', '.')
            elif '.' in val_str:
                # Has only dot - check if thousands separator
                parts = val_str.split('.')
                if len(parts) == 2 and len(parts[1]) == 3 and len(parts[0]) > 0:
                    # Brazilian thousands: 1.607 -> 1607
                    val_str = val_str.replace('.', '')
            return float(val_str)
        except:
            return None
    
    # Parse all rows
    parsed_rows = []
    for idx, row in df.iterrows():
        try:
            license_plate = str(row.iloc[col_placa]).strip().upper() if pd.notna(row.iloc[col_placa]) else None
            
            if not license_plate or license_plate == "" or license_plate == "NAN" or license_plate == "TOTAL":
                continue
            
            km_driven = safe_int(row.iloc[col_km_rodados]) if len(row) > col_km_rodados else None
            last_km = safe_int(row.iloc[col_ultima_km]) if len(row) > col_ultima_km else None
            liters = safe_float(row.iloc[col_litros]) if len(row) > col_litros else None
            total_cost = safe_float(row.iloc[col_total]) if len(row) > col_total else None
            
            # Fix HTML decimal issue
            if is_html:
                if liters and liters > 500:
                    liters = liters / 100
                if total_cost and total_cost > 5000:
                    total_cost = total_cost / 100
            
            parsed_rows.append({
                "license_plate": license_plate,
                "km_driven": km_driven,
                "last_km": last_km,
                "liters": round(liters, 2) if liters else None,
                "total_cost": round(total_cost, 2) if total_cost else 0
            })
        except Exception as e:
            continue
    
    return {
        "competence_date": competence_date.isoformat(),
        "competence_label": competence_date.strftime("%m/%Y"),
        "rows": parsed_rows,
        "total_records": len(parsed_rows)
    }

@router.post("/fleet/fuel/preview")
async def preview_fuel_report(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """Preview fuel data before importing - returns parsed data without saving"""
    try:
        content = await file.read()
        filename = file.filename or ""
        
        parsed = parse_fuel_spreadsheet(content, filename)
        
        # Aggregate by vehicle (same plate may appear multiple times with different fuel types)
        aggregated = {}
        for row in parsed["rows"]:
            plate = row["license_plate"]
            if plate in aggregated:
                # Sum values
                agg = aggregated[plate]
                agg["liters"] = (agg["liters"] or 0) + (row["liters"] or 0)
                agg["km_driven"] = (agg["km_driven"] or 0) + (row["km_driven"] or 0)
                agg["total_cost"] = (agg["total_cost"] or 0) + (row["total_cost"] or 0)
                # Take max of last_km
                if row["last_km"] and (not agg["last_km"] or row["last_km"] > agg["last_km"]):
                    agg["last_km"] = row["last_km"]
            else:
                aggregated[plate] = dict(row)
        
        # Enrich with vehicle info
        preview_data = []
        errors = []
        
        for plate, row in aggregated.items():
            result = await db.execute(
                select(models.Fleet).where(models.Fleet.license_plate == plate)
            )
            vehicle = result.scalar_one_or_none()
            
            if vehicle:
                preview_data.append({
                    **row,
                    "liters": round(row["liters"], 2) if row["liters"] else None,
                    "total_cost": round(row["total_cost"], 2) if row["total_cost"] else 0,
                    "vehicle_id": vehicle.id,
                    "vehicle_model": vehicle.model,
                    "vehicle_brand": vehicle.brand,
                    "found": True
                })
            else:
                errors.append(f"Placa {plate} não cadastrada")
        
        return {
            "success": True,
            "competence_date": parsed["competence_date"],
            "competence_label": parsed["competence_label"],
            "preview": preview_data,
            "total_found": len(preview_data),
            "errors": errors[:10]
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao processar planilha: {str(e)}")

@router.post("/fleet/fuel/confirm")
async def confirm_fuel_import(data: dict, db: AsyncSession = Depends(get_db)):
    """Confirm and save the previewed fuel data"""
    from datetime import datetime
    
    try:
        competence_date = datetime.fromisoformat(data["competence_date"]).date()
        rows = data["rows"]
        
        processed = 0
        updated_km = 0
        
        for row in rows:
            vehicle_id = row.get("vehicle_id")
            if not vehicle_id:
                continue
            
            # Get vehicle
            result = await db.execute(
                select(models.Fleet).where(models.Fleet.id == vehicle_id)
            )
            vehicle = result.scalar_one_or_none()
            if not vehicle:
                continue
            
            # Delete existing records for this vehicle/date (handles duplicates)
            from sqlalchemy import delete
            await db.execute(
                delete(models.VehicleFuelCost).where(
                    models.VehicleFuelCost.vehicle_id == vehicle_id,
                    models.VehicleFuelCost.competence_date == competence_date
                )
            )
            
            # Create new record with aggregated values
            fuel_cost = models.VehicleFuelCost(
                vehicle_id=vehicle_id,
                competence_date=competence_date,
                total_cost=row.get("total_cost", 0),
                liters=row.get("liters"),
                km_driven=row.get("km_driven")
            )
            db.add(fuel_cost)
            
            processed += 1
            
            # Update odometer
            last_km = row.get("last_km")
            if last_km and last_km > (vehicle.odometer or 0):
                vehicle.odometer = last_km
                updated_km += 1
        
        await db.commit()
        
        return {
            "success": True,
            "processed": processed,
            "km_updated": updated_km
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao salvar dados: {str(e)}")

@router.delete("/fleet/fuel/{fuel_id}")
async def delete_fuel_cost(fuel_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a fuel cost record by ID"""
    result = await db.execute(
        select(models.VehicleFuelCost).where(models.VehicleFuelCost.id == fuel_id)
    )
    fuel_record = result.scalar_one_or_none()
    
    if not fuel_record:
        raise HTTPException(status_code=404, detail="Registro de combustível não encontrado")
    
    await db.delete(fuel_record)
    await db.commit()
    return {"message": "Registro excluído com sucesso"}

@router.delete("/fleet/{vehicle_id}/fuel/clear")
async def clear_vehicle_fuel_costs(vehicle_id: int, db: AsyncSession = Depends(get_db)):
    """Delete all fuel cost records for a vehicle"""
    from sqlalchemy import delete
    await db.execute(
        delete(models.VehicleFuelCost).where(models.VehicleFuelCost.vehicle_id == vehicle_id)
    )
    await db.commit()
    return {"message": "Registros de combustível limpos"}
