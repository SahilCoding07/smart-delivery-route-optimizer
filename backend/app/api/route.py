"""
Route Optimization Endpoint.

What it does:
    Handles multi-stop route sequencing and leg pathfinding for delivery businesses.
    Validates input stops against the city network bounds, snaps coordinates to nearest
    intersections, builds the distance matrix, solves TSP with Nearest Neighbour + 2-opt,
    calculates per-stop ETAs, and generates complete polyline road geometries per leg.
"""

from __future__ import annotations
from datetime import datetime, timedelta
import time
from typing import Any
from fastapi import APIRouter, HTTPException, status
from app.core.build_graph import get_active_graph
from app.core.tsp import solve_tsp
from app.ml.predict import make_ml_weight_fn
from app.schemas import (
    RouteOptimizeRequest,
    RouteOptimizeResponse,
    OrderedStop,
    LegDetail,
)

router = APIRouter(prefix="/route", tags=["Routing"])


def check_point_in_bounds(lat: float, lon: float, bbox: tuple[float, float, float, float], margin: float = 3.0) -> bool:
    """Check if a coordinate lies within valid bounds (all of India territory or active region bbox)."""
    if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
        return False
    # Accept any coordinates across India territory
    is_in_india = (6.0 <= lat <= 38.0 and 68.0 <= lon <= 98.0)
    if is_in_india:
        return True
    min_lat, min_lon, max_lat, max_lon = bbox
    return (
        (min_lat - margin <= lat <= max_lat + margin)
        and (min_lon - margin <= lon <= max_lon + margin)
    )


@router.post(
    "/optimize",
    response_model=RouteOptimizeResponse,
    summary="Optimize Multi-Stop Delivery Route",
    status_code=status.HTTP_200_OK,
)
def optimize_route(request: RouteOptimizeRequest) -> RouteOptimizeResponse:
    """
    Plan the optimal delivery sequence and road path for a depot and 1–30 stops.

    - Computes fastest path using Dijkstra or A*.
    - Uses ML predicted travel times as graph edge weights when `use_ml=True`.
    - Optimizes stop visit order via Nearest Neighbour + 2-Opt local search.
    - Returns full polyline coordinates and per-stop ETA clock times.
    """
    start_time = time.perf_counter()
    graph = get_active_graph()
    bbox = graph.bounding_box()

    # 1. Coordinate Validation
    if not check_point_in_bounds(request.depot.lat, request.depot.lon, bbox):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Depot coordinate ({request.depot.lat}, {request.depot.lon}) is outside the active "
                f"road network bounding box: Lat [{bbox[0]:.4f}, {bbox[2]:.4f}], Lon [{bbox[1]:.4f}, {bbox[3]:.4f}]."
            ),
        )

    for stop in request.stops:
        if not check_point_in_bounds(stop.lat, stop.lon, bbox):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Stop '{stop.name}' ({stop.lat}, {stop.lon}) is outside the active "
                    f"road network bounding box: Lat [{bbox[0]:.4f}, {bbox[2]:.4f}], Lon [{bbox[1]:.4f}, {bbox[3]:.4f}]."
                ),
            )

    # 2. Map coordinates to nearest graph intersections
    depot_node = graph.nearest_node(request.depot.lat, request.depot.lon)
    
    stop_map: dict[str, Any] = {}
    node_to_stop: dict[Any, Any] = {}
    delivery_nodes: list[Any] = []

    for stop in request.stops:
        nearest_id = graph.nearest_node(stop.lat, stop.lon)
        stop_map[stop.id] = {
            "stop": stop,
            "node": nearest_id,
        }
        node_to_stop[nearest_id] = stop
        delivery_nodes.append(nearest_id)

    # 3. Configure Edge Weight Function (ML vs. Raw Distance)
    if request.use_ml:
        weight_fn = make_ml_weight_fn(
            departure_time=request.departure_time,
            weather=request.weather,
        )
    else:
        weight_fn = None  # defaults to physical length_km in dijkstra/astar

    # 4. Multi-Stop TSP Optimization
    tsp_res = solve_tsp(
        graph=graph,
        depot_node=depot_node,
        delivery_nodes=delivery_nodes,
        weight_fn=weight_fn,
        algorithm=request.algorithm,
        run_exact_if_small=True,
    )

    # 5. Temporal calculation & per-stop ETAs
    base_departure_dt = datetime.now()
    if request.departure_time:
        try:
            clean_str = request.departure_time.replace("Z", "+00:00")
            base_departure_dt = datetime.fromisoformat(clean_str)
        except Exception:
            base_departure_dt = datetime.now()

    current_dt = base_departure_dt
    total_distance_km = 0.0
    total_time_minutes = 0.0

    legs: list[LegDetail] = []
    ordered_stops: list[OrderedStop] = []

    # Map tour nodes back to stops
    # The first element is always depot
    depot_lat, depot_lon = graph.get_coords(depot_node)
    ordered_stops.append(
        OrderedStop(
            id="depot",
            name="Depot / Warehouse",
            lat=depot_lat,
            lon=depot_lon,
            visit_index=0,
            eta=base_departure_dt.strftime("%H:%M"),
            is_depot=True,
        )
    )

    visited_stop_ids: set[str] = set()

    for idx, leg in enumerate(tsp_res.legs):
        u, v = leg["from_node"], leg["to_node"]
        leg_cost = leg["cost"]
        path_nodes = leg["path"]

        # Calculate exact physical distance along the path
        leg_dist_km = 0.0
        for i in range(len(path_nodes) - 1):
            curr_n, next_n = path_nodes[i], path_nodes[i + 1]
            nbr_dict = dict(graph.neighbors(curr_n))
            edge_data = nbr_dict.get(next_n, {})
            leg_dist_km += float(edge_data.get("length_km", 0.5))

        # Leg duration in minutes
        if request.use_ml:
            leg_minutes = float(leg_cost)
        else:
            # Distance / default speed (35 km/h) * 60
            leg_minutes = (leg_dist_km / 35.0) * 60.0

        leg_departure_str = current_dt.strftime("%H:%M")
        current_dt += timedelta(minutes=leg_minutes)
        leg_arrival_str = current_dt.strftime("%H:%M")

        total_distance_km += leg_dist_km
        total_time_minutes += leg_minutes

        # Polyline coordinates
        polyline = [list(graph.get_coords(n)) for n in path_nodes]

        # Stop info
        to_stop = node_to_stop.get(v)
        if to_stop and to_stop.id not in visited_stop_ids:
            visited_stop_ids.add(to_stop.id)
            ordered_stops.append(
                OrderedStop(
                    id=to_stop.id,
                    name=to_stop.name,
                    lat=to_stop.lat,
                    lon=to_stop.lon,
                    visit_index=len(ordered_stops),
                    eta=leg_arrival_str,
                    is_depot=False,
                )
            )
        elif v == depot_node and idx == len(tsp_res.legs) - 1:
            # Final return to depot
            ordered_stops.append(
                OrderedStop(
                    id="depot_return",
                    name="Return to Depot",
                    lat=depot_lat,
                    lon=depot_lon,
                    visit_index=len(ordered_stops),
                    eta=leg_arrival_str,
                    is_depot=True,
                )
            )

        from_name = "Depot" if u == depot_node else getattr(node_to_stop.get(u), "name", str(u))
        to_name = "Depot" if v == depot_node else getattr(node_to_stop.get(v), "name", str(v))

        legs.append(
            LegDetail(
                from_stop_id=str(u),
                from_name=from_name,
                to_stop_id=str(v),
                to_name=to_name,
                distance_km=round(leg_dist_km, 2),
                duration_minutes=round(leg_minutes, 1),
                departure_time=leg_departure_str,
                arrival_time=leg_arrival_str,
                polyline_coords=polyline,
            )
        )

    compute_time_ms = (time.perf_counter() - start_time) * 1000.0

    return RouteOptimizeResponse(
        ordered_stops=ordered_stops,
        legs=legs,
        total_distance_km=round(total_distance_km, 2),
        total_time_minutes=round(total_time_minutes, 1),
        nodes_explored=len(graph.nodes),
        compute_time_ms=round(compute_time_ms, 2),
        two_opt_improvement_pct=round(tsp_res.improvement_pct, 1),
        two_opt_swaps=tsp_res.two_opt_swaps,
        algorithm_used=request.algorithm.upper(),
        ml_applied=request.use_ml,
    )
