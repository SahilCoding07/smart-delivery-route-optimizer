"""Health Check Endpoint."""

from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Service Health Check")
def health_check() -> dict[str, str]:
    """Check service health and operational status."""
    return {
        "status": "healthy",
        "app": "RouteWise",
        "version": "1.0.0",
    }
