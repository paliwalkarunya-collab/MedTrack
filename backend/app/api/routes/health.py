from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class HealthResponse(BaseModel):
    status: str

@router.get("", response_model=HealthResponse)
def get_health():
    """
    Health check endpoint.
    Must return 200 OK with {"status": "ok"}
    Does not require a live database connection.
    """
    return {"status": "ok"}
