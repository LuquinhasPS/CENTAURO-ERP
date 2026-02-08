"""
Commercial Package Router
Aggregates all commercial sub-routers: clients, contracts, projects
"""
from fastapi import APIRouter
from app.routers.commercial import clients, contracts, projects, email

router = APIRouter()

# Include all sub-routers
router.include_router(clients.router)
router.include_router(contracts.router)
router.include_router(projects.router)
router.include_router(email.router)
