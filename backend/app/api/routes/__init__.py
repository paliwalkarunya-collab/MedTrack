from fastapi import APIRouter
from app.api.routes import health, categories, medicines, inventory_batches, suppliers, purchases, inventory, auth, settings

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(categories.router, prefix="/medicines/categories", tags=["medicine_categories"])
api_router.include_router(medicines.router, prefix="/medicines", tags=["medicines"])
api_router.include_router(inventory_batches.router, prefix="/medicines/batches", tags=["inventory_batches"])
api_router.include_router(suppliers.router, prefix="/suppliers", tags=["suppliers"])
api_router.include_router(purchases.router, prefix="/purchases", tags=["purchases"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
