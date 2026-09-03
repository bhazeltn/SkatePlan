"""SkatePlan FastAPI application entrypoint."""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.audit import configure_audit_listeners

# Register SafeSport audit-trail listeners at import time.
configure_audit_listeners()

app = FastAPI(title="SkatePlan API", version="0.1.0")

# CORS: public origin + local dev.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ab12b61bf.abacusai.cloud",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_frame_headers(request: Request, call_next):
    """Allow embedding inside apps.abacus.ai iframe; do NOT send X-Frame-Options: DENY."""
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = (
        "frame-ancestors 'self' https://*.abacus.ai"
    )
    return response


app.include_router(api_router, prefix="/api")


@app.get("/", tags=["root"])
def root() -> dict[str, str]:
    return {"app": "SkatePlan", "docs": "/docs", "api": "/api"}
