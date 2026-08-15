# MedTrack FastAPI Backend Foundation

This is the backend foundation for MedTrack (Ticket 15A). It provides a clean, independent FastAPI architecture.

## Setup Instructions

### 1. Requirements

- Python 3.13

### 2. Create Virtual Environment

On Windows:
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 3. Install Dependencies

```powershell
pip install -r requirements.txt
```

### 4. Configuration

Copy the example environment variables:
```powershell
copy .env.example .env
```
(Do not commit `.env` with real secrets to version control.)

### 5. Start the Server

```powershell
uvicorn app.main:app --reload
```

- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check:** [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

### 6. Run Tests

```powershell
pytest
```

### 7. Alembic (Migrations)

Alembic is configured for future database migrations.
To run alembic commands (when models are added later):
```powershell
alembic revision --autogenerate -m "description"
alembic upgrade head
```
