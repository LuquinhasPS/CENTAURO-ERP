from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import commercial, assets, operational, tickets, kanban, project_resources, purchases, roles, auth
from app.database import engine, Base

app = FastAPI(title="Centauro ERP")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(commercial.router, prefix="/commercial", tags=["Commercial"])
app.include_router(assets.router, prefix="/assets", tags=["Assets"])
app.include_router(operational.router, prefix="/operational", tags=["Operational"])
app.include_router(tickets.router, prefix="/tickets", tags=["Tickets"])
app.include_router(kanban.router, prefix="/kanban", tags=["Kanban"])
app.include_router(project_resources.router, prefix="/project-resources", tags=["Project Resources"])
app.include_router(purchases.router, prefix="/purchases", tags=["Purchases"])

app.include_router(roles.router, prefix="/roles", tags=["Roles"])
app.include_router(auth.router, tags=["Authentication"])
from app.routers import dashboard
app.include_router(dashboard.router, tags=["Dashboard"])

@app.on_event("startup")
async def startup():
    # In production, use Alembic for migrations.
    # For prototype, create tables on startup.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/")
async def root():
    return {"message": "Welcome to Centauro ERP API"}
