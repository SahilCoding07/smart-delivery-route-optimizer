"""
RouteWise Main FastAPI Application Entrypoint.
"""

from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.build_graph import build_or_load_graph
from app.ml.predict import load_eta_model
from app.api.health import router as health_router
from app.api.graph import router as graph_router
from app.api.route import router as route_router
from app.api.eta import router as eta_router
from app.api.ml import router as ml_router
from app.api.benchmark import router as benchmark_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("routewise")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Warm up cached road graph and trained ML model on server startup."""
    logger.info("Initializing RouteWise server...")
    # Preload graph
    graph = build_or_load_graph()
    logger.info(f"Loaded road network: '{graph.name}' ({graph.node_count} nodes, {graph.edge_count} edges).")
    # Preload ML model
    model = load_eta_model()
    if model:
        logger.info("Loaded trained ETA model into memory.")
    else:
        logger.warning("No ETA model loaded; will use baseline physics fallback.")
    yield
    logger.info("Shutting down RouteWise server...")


app = FastAPI(
    title="RouteWise API",
    description=(
        "Smart Delivery Route Optimizer with ML-powered ETA Prediction. "
        "Integrates dynamic travel-time regression directly into Dijkstra, A*, and TSP algorithms."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware for React + Vite dev server and production clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits local Vite frontend & dev ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers with /api prefix
app.include_router(health_router, prefix="/api")
app.include_router(graph_router, prefix="/api")
app.include_router(route_router, prefix="/api")
app.include_router(eta_router, prefix="/api")
app.include_router(ml_router, prefix="/api")
app.include_router(benchmark_router, prefix="/api")


@app.get("/", summary="Root Index")
def root_index() -> dict[str, str]:
    return {
        "message": "Welcome to RouteWise API",
        "documentation": "/docs",
        "health": "/api/health",
    }
