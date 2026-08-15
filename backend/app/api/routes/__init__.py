from fastapi import APIRouter
from app.api.routes import health, categories, medicines, inventory_batches

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(categories.router, prefix="/medicines/categories")
api_router.include_router(medicines.router, prefix="/medicines")
api_router.include_router(inventory_batches.router, prefix="/medicines/batches")
