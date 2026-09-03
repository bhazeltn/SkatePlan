"""Top-level API router mounted under /api."""
from fastapi import APIRouter

from app.api import auth, skaters

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(skaters.router)


@api_router.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
