"""Graph Information and Road Network Endpoints."""

from fastapi import APIRouter
from app.core.build_graph import get_active_graph
from app.schemas import GraphInfoResponse

router = APIRouter(prefix="/graph", tags=["Graph"])


@router.get("/info", response_model=GraphInfoResponse, summary="Get Road Network Information")
def get_graph_info() -> GraphInfoResponse:
    """Retrieve metadata about the currently active road network graph."""
    graph = get_active_graph()
    bbox = graph.bounding_box()

    return GraphInfoResponse(
        city_name=graph.name,
        node_count=graph.node_count,
        edge_count=graph.edge_count,
        bounding_box={
            "min_lat": round(bbox[0], 5),
            "min_lon": round(bbox[1], 5),
            "max_lat": round(bbox[2], 5),
            "max_lon": round(bbox[3], 5),
        },
    )


@router.get("/nodes", summary="Get Sample Intersections for Map Rendering")
def get_graph_nodes(limit: int = 500) -> list[dict[str, float | str]]:
    """Retrieve node coordinate points for visualization or stop picking."""
    graph = get_active_graph()
    nodes = []
    for node_id in graph.nodes[:limit]:
        lat, lon = graph.get_coords(node_id)
        nodes.append({
            "id": str(node_id),
            "lat": lat,
            "lon": lon,
        })
    return nodes
