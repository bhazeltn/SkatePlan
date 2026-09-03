"""Top-level API router mounted under /api."""
from fastapi import APIRouter

from app.api import (
    admin,
    auth,
    competitions,
    external,
    federations,
    programs,
    schedule,
    scoring,
    skaters,
    training,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(skaters.router)
api_router.include_router(schedule.router)
api_router.include_router(admin.router)
api_router.include_router(federations.router)
api_router.include_router(external.router)
api_router.include_router(programs.router)
api_router.include_router(scoring.router)
api_router.include_router(competitions.router)
api_router.include_router(competitions.skater_router)
api_router.include_router(training.session_router)
api_router.include_router(training.skater_router)


@api_router.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
