"""Top-level API router mounted under /api."""
from fastapi import APIRouter

from app.api import (
    admin,
    auth,
    competitions,
    dashboard,
    external,
    federations,
    injuries,
    meetings,
    programs,
    schedule,
    scoring,
    skater_records,
    skaters,
    sov,
    standards,
    training,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(skaters.router)
api_router.include_router(skater_records.router)
api_router.include_router(sov.router)
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
api_router.include_router(injuries.router)
api_router.include_router(injuries.skater_router)
api_router.include_router(meetings.router)
api_router.include_router(meetings.skater_router)
api_router.include_router(standards.router)
api_router.include_router(standards.skater_router)


@api_router.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
