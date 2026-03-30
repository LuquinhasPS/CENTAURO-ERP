# =========================================
# TIMEZONE CONFIGURATION - MUST BE FIRST!
# =========================================
# Set timezone to Brasilia (UTC-3) for ALL datetime operations
import os
import time
os.environ['TZ'] = 'America/Sao_Paulo'
# time.tzset() only works on Unix, but setting TZ still helps with pytz
if hasattr(time, 'tzset'):
    time.tzset()
# =========================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import assets, operational, tickets, kanban, project_resources, purchases, roles, auth, teams, maintenance, finance_payroll, proposals
from app.routers import commercial  # Package import
from app.routers import finance     # Package import
from app.database import engine, Base
from sqlalchemy import text
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

app = FastAPI(title="Centauro ERP")

# Trust reverse proxy headers (Railway)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
# Commercial Package (Clients, Contracts, Projects)
app.include_router(commercial.router, prefix="/commercial", tags=["Commercial"])

# Finance Package (Billings, Tax Import)
app.include_router(finance.router, prefix="/commercial", tags=["Finance"])  # Keep /commercial prefix for backwards compatibility

# CRM
app.include_router(proposals.router) # Prefix defined in router

# Other modules
app.include_router(assets.router, prefix="/assets", tags=["Assets"])
app.include_router(operational.router, prefix="/operational", tags=["Operational"])
app.include_router(tickets.router, prefix="/tickets", tags=["Tickets"])
app.include_router(kanban.router, prefix="/kanban", tags=["Kanban"])
app.include_router(project_resources.router, prefix="/project-resources", tags=["Project Resources"])
app.include_router(purchases.router, prefix="/purchases", tags=["Purchases"])
app.include_router(finance_payroll.router, tags=["Finance Payroll"])

app.include_router(roles.router, prefix="/roles", tags=["Roles"])
app.include_router(auth.router, tags=["Authentication"])
app.include_router(teams.router, prefix="/teams", tags=["Teams"])
app.include_router(maintenance.router, prefix="/maintenance", tags=["Maintenance"])

from app.routers import dashboard, ai
app.include_router(dashboard.router, tags=["Dashboard"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])

@app.on_event("startup")
async def startup():
    # In production, use Alembic for migrations.
    # For prototype, create tables on startup.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # Schema Migration: Add missing columns if they don't exist
        # This is a manual migration for the prototype phase
        columns_to_add = [
            # Table, Column, SQL Type
            ("contracts", "contract_type", "VARCHAR DEFAULT 'LPU'"),
            ("contracts", "title", "VARCHAR"),
            ("contracts", "monthly_value", "NUMERIC(10, 2)"),
            ("contracts", "due_day", "INTEGER"),
            ("contracts", "readjustment_index", "VARCHAR"),
            ("contracts", "company_id", "INTEGER"),
            ("projects", "service_value", "NUMERIC(10, 2) DEFAULT 0"),
            ("projects", "material_value", "NUMERIC(10, 2) DEFAULT 0"),
            ("projects", "budget", "NUMERIC(10, 2) DEFAULT 0"),
            ("projects", "company_id", "INTEGER"),
            ("projects", "estimated_days", "INTEGER"),
            ("projects", "warranty_months", "INTEGER"),

            # Commercial Proposals
            ("commercial_proposals", "internal_id", "VARCHAR"),
            ("commercial_proposals", "title", "VARCHAR"),
            ("commercial_proposals", "description", "TEXT"),
            ("commercial_proposals", "responsible", "VARCHAR"),
            ("commercial_proposals", "client_name", "VARCHAR"),
            ("commercial_proposals", "client_id", "INTEGER"),
            ("commercial_proposals", "value", "NUMERIC(10, 2)"),
            ("commercial_proposals", "labor_value", "NUMERIC(10, 2)"),
            ("commercial_proposals", "material_value", "NUMERIC(10, 2)"),
            ("commercial_proposals", "status", "VARCHAR"),
            ("commercial_proposals", "proposal_type", "VARCHAR"),
            ("commercial_proposals", "company_id", "INTEGER"),
            ("commercial_proposals", "decision_date", "DATE"),
            ("commercial_proposals", "loss_reason", "VARCHAR"),
            ("commercial_proposals", "history", "TEXT"),
            ("commercial_proposals", "converted_project_id", "INTEGER"),
            ("commercial_proposals", "converted_contract_id", "INTEGER"),
            ("commercial_proposals", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
            ("commercial_proposals", "updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
            
            # Proposal Tasks
            ("proposal_tasks", "proposal_id", "INTEGER NOT NULL"),
            ("proposal_tasks", "title", "VARCHAR NOT NULL"),
            ("proposal_tasks", "due_date", "TIMESTAMP NOT NULL"),
            ("proposal_tasks", "recurrence_days", "INTEGER"),
            ("proposal_tasks", "is_active", "BOOLEAN DEFAULT TRUE"),
            ("proposal_tasks", "is_completed", "BOOLEAN DEFAULT FALSE"),
            ("proposal_tasks", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
            ("proposal_tasks", "completed_at", "TIMESTAMP"),
            
            # Project Billings Migrations
            ("project_billings", "substitution_reason", "VARCHAR"),
            ("project_billings", "category", "VARCHAR DEFAULT 'SERVICE'"),
            ("project_billings", "gross_value", "NUMERIC(10, 2) DEFAULT 0"),
            ("project_billings", "net_value", "NUMERIC(10, 2) DEFAULT 0"),
            ("project_billings", "taxes_verified", "BOOLEAN DEFAULT 0"),
            
            # Retentions
            ("project_billings", "retention_iss", "NUMERIC(10, 2) DEFAULT 0"),
            ("project_billings", "retention_inss", "NUMERIC(10, 2) DEFAULT 0"),
            ("project_billings", "retention_irrf", "NUMERIC(10, 2) DEFAULT 0"),
            ("project_billings", "retention_pis", "NUMERIC(10, 2) DEFAULT 0"),
            ("project_billings", "retention_cofins", "NUMERIC(10, 2) DEFAULT 0"),
            ("project_billings", "retention_csll", "NUMERIC(10, 2) DEFAULT 0"),
            
            # Non-ZRetained Taxes
            ("project_billings", "tax_pis", "NUMERIC(10, 2) DEFAULT 0"),
            ("project_billings", "tax_cofins", "NUMERIC(10, 2) DEFAULT 0"),
            ("project_billings", "tax_iss", "NUMERIC(10, 2) DEFAULT 0"),
            ("project_billings", "tax_irpj", "NUMERIC(10, 2) DEFAULT 0"),
            
            # Material Taxes
            ("project_billings", "tax_icms", "NUMERIC(10, 2) DEFAULT 0"),
            ("project_billings", "tax_ipi", "NUMERIC(10, 2) DEFAULT 0"),
            # Purchase Withdrawals and Item Fields
            ("purchase_items", "manufacturer", "VARCHAR"),
            ("purchase_items", "model", "VARCHAR"),
            ("purchase_items", "unit", "VARCHAR DEFAULT 'un'"),
            ("purchase_items", "unit_price", "NUMERIC(10, 2) DEFAULT 0"),
            ("purchase_items", "total_price", "NUMERIC(10, 2) DEFAULT 0"),
            ("purchase_items", "quantity", "INTEGER DEFAULT 1"),
            ("purchase_items", "quantity_withdrawn", "INTEGER DEFAULT 0"),
            ("purchase_items", "supplier", "VARCHAR"),
            ("purchase_items", "payment_method", "VARCHAR"),
            ("purchase_items", "installment_count", "INTEGER DEFAULT 1"),
            ("purchase_items", "status", "VARCHAR DEFAULT 'pending'"),
            ("purchase_items", "expected_date", "DATE"),
            ("purchase_items", "notes", "VARCHAR"),
            ("purchase_items", "link_original", "VARCHAR"),
            ("purchase_items", "link_compras", "VARCHAR"),

            # Purchase Requests - Service fields
            ("purchase_requests", "category", "VARCHAR DEFAULT 'MATERIAL'"),
            ("purchase_requests", "service_start_date", "DATE"),
            ("purchase_requests", "service_end_date", "DATE"),
            ("purchase_requests", "is_indefinite_term", "BOOLEAN DEFAULT 0"),
            ("purchase_requests", "arrival_forecast", "DATE"),
            ("purchase_requests", "notes", "TEXT"),

            # Purchase Requests - Approval Workflow
            ("purchase_requests", "tech_approval_at", "TIMESTAMP"),
            ("purchase_requests", "tech_approver_id", "INTEGER"),
            ("purchase_requests", "control_approval_at", "TIMESTAMP"),
            ("purchase_requests", "control_approver_id", "INTEGER"),
            ("purchase_requests", "finance_approval_at", "TIMESTAMP"),
            ("purchase_requests", "finance_approver_id", "INTEGER"),
            ("purchase_requests", "rejection_reason", "VARCHAR"),
            ("purchase_requests", "rejected_by_id", "INTEGER"),
            ("purchase_requests", "rejected_at", "TIMESTAMP"),

            # Directory URL fields
            ("purchase_requests", "directory_url", "VARCHAR"),
            ("projects", "directory_url", "VARCHAR"),
            ("contracts", "directory_url", "VARCHAR"),
        ]

        for table, col, dtype in columns_to_add:
            try:
                # Use a nested transaction (savepoint) so that if the SELECT fails,
                # the whole transaction is not aborted (critical for PostgreSQL).
                async with conn.begin_nested():
                    await conn.execute(text(f"SELECT {col} FROM {table} LIMIT 1"))
            except Exception:
                print(f"Migrating: Adding {col} to {table}")
                await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {dtype}"))
    
    # Start the email scheduler
    from app.services.scheduler_service import start_scheduler
    start_scheduler()

@app.on_event("shutdown")
async def shutdown():
    from app.services.scheduler_service import stop_scheduler
    stop_scheduler()

@app.get("/")
async def root():
    return {"message": "Welcome to Centauro ERP API"}

@app.get("/debug/timezone")
async def debug_timezone():
    """
    Endpoint de diagnóstico para verificar configuração de timezone.
    """
    from datetime import datetime
    from app.utils.timezone import now_brazil, today_brazil, BRAZIL_TZ
    import pytz
    
    utc_now = datetime.utcnow()
    local_now = datetime.now()
    brazil_now = now_brazil()
    
    return {
        "utc_time": utc_now.strftime("%d/%m/%Y %H:%M:%S"),
        "local_time (datetime.now)": local_now.strftime("%d/%m/%Y %H:%M:%S"),
        "brazil_time (now_brazil)": brazil_now.strftime("%d/%m/%Y %H:%M:%S"),
        "brazil_date (today_brazil)": today_brazil().strftime("%d/%m/%Y"),
        "timezone_env": os.environ.get('TZ', 'NOT SET'),
        "expected_brazil_time": "Should match your local clock if you are in Brazil"
    }

@app.post("/api/seed_database", tags=["Admin"])
async def trigger_seed_database(confirm: str = "yes"):
    """
    ATENÇÃO: Este endpoint DELETA e repopula todos os dados do banco.
    Usar apenas uma vez ou em ambiente de desenvolvimento/homologação!
    """
    if confirm != "CONFIRMAR_SEED":
        return {"error": "Envie confirm='CONFIRMAR_SEED' para rodar este comando extremamente arriscado."}
    
    # Double protection: Only allow if an environment variable is explicitly set
    if os.environ.get("ALLOW_SEED", "false").lower() != "true":
        return {"error": "O seed não está autorizado neste ambiente. Defina ALLOW_SEED=true nas variáveis de ambiente do Railway para liberar."}
    
    import seed_data
    try:
        await seed_data.main()
        return {"message": "Seed executado com sucesso! Verifique os logs."}
    except Exception as e:
        return {"error": f"Erro durante o seed: {str(e)}"}
