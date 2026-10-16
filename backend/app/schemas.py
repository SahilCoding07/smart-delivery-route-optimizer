"""
Pydantic v2 Request and Response Schemas for RouteWise REST API.
"""

from __future__ import annotations
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field, field_validator


class Coordinate(BaseModel):
    """Geographical coordinate."""
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees")
    lon: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees")


class StopInput(BaseModel):
    """A delivery stop location with identifier and metadata."""
    id: str = Field(..., description="Unique client-assigned ID for the stop")
    name: str = Field(..., description="Human-readable customer/destination name")
    lat: float = Field(..., ge=-90.0, le=90.0)
    lon: float = Field(..., ge=-180.0, le=180.0)


class RouteOptimizeRequest(BaseModel):
    """Input payload for multi-stop route optimization."""
    depot: Coordinate = Field(..., description="Starting and ending depot location")
    stops: list[StopInput] = Field(
        ...,
        min_length=1,
        max_length=30,
        description="Delivery stops to visit (between 1 and 30)",
    )
    departure_time: Optional[str] = Field(
        None,
        description="ISO 8601 departure timestamp (e.g. '2026-10-16T14:30:00Z')",
    )
    weather: Literal["clear", "rain"] = Field(
        "clear",
        description="Current meteorological condition",
    )
    algorithm: Literal["dijkstra", "astar"] = Field(
        "astar",
        description="Shortest-path algorithm to use ('astar' or 'dijkstra')",
    )
    use_ml: bool = Field(
        True,
        description="Whether to use ML-predicted travel times as edge weights",
    )

    @field_validator("stops")
    @classmethod
    def validate_unique_stops(cls, stops: list[StopInput]) -> list[StopInput]:
        ids = [s.id for s in stops]
        if len(ids) != len(set(ids)):
            raise ValueError("All stop IDs must be unique.")
        return stops


class LegDetail(BaseModel):
    """Information for a single leg between two consecutive stops."""
    from_stop_id: str
    from_name: str
    to_stop_id: str
    to_name: str
    distance_km: float
    duration_minutes: float
    departure_time: str
    arrival_time: str
    polyline_coords: list[list[float]] = Field(
        ...,
        description="Sequence of [lat, lon] coordinates representing the road polyline",
    )


class OrderedStop(BaseModel):
    """Output representation of a stop in optimized visit sequence."""
    id: str
    name: str
    lat: float
    lon: float
    visit_index: int
    eta: str
    is_depot: bool = False


class RouteOptimizeResponse(BaseModel):
    """Comprehensive multi-stop optimization result."""
    ordered_stops: list[OrderedStop]
    legs: list[LegDetail]
    total_distance_km: float
    total_time_minutes: float
    nodes_explored: int
    compute_time_ms: float
    two_opt_improvement_pct: float
    two_opt_swaps: int
    algorithm_used: str
    ml_applied: bool


class ETAPredictRequest(BaseModel):
    """Request payload to predict single-leg travel time."""
    distance_km: float = Field(..., gt=0.0, le=100.0, description="Distance in kilometers")
    road_type: Literal["residential", "primary", "highway"] = "residential"
    num_turns: int = Field(1, ge=0, le=50)
    departure_time: Optional[str] = None
    weather: Literal["clear", "rain"] = "clear"


class ETAPredictResponse(BaseModel):
    """Prediction output for a single leg."""
    predicted_travel_time_minutes: float
    effective_speed_kmh: float
    model_used: str


class GraphInfoResponse(BaseModel):
    """Active road network metadata."""
    city_name: str
    node_count: int
    edge_count: int
    bounding_box: dict[str, float]


class MLMetricsResponse(BaseModel):
    """Trained models benchmark table and training summary."""
    models: dict[str, dict[str, float]]
    champion: str
    sample_count: int
    test_size: int


class BenchmarkResponse(BaseModel):
    """Performance benchmark between Dijkstra and A*."""
    num_pairs: int
    dijkstra_avg_time_ms: float
    dijkstra_avg_nodes: float
    astar_avg_time_ms: float
    astar_avg_nodes: float
    node_reduction_pct: float
    time_reduction_pct: float
