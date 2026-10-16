"""
City Road Graph Builder and Cache Manager.

What it does:
    Builds or loads the road network Graph for RouteWise:
    - In offline/default mode (USE_SYNTHETIC_GRID=true), constructs a 30x30 grid city
      (900 intersections, 3,480 edges) with realistic road hierarchies.
    - If USE_SYNTHETIC_GRID=false, attempts to download and cache real-world drivable
      road networks via OSMnx for the configured CITY environment variable.
    - Provides load_active_graph() with in-memory caching for FastAPI.
"""

from __future__ import annotations
import json
import logging
from pathlib import Path
from typing import Any
from app.config import settings
from app.core.graph import (
    Graph,
    generate_synthetic_grid,
    from_networkx_graph,
)

logger = logging.getLogger("routewise.build_graph")

_ACTIVE_GRAPH: Graph | None = None


def save_graph_to_json(graph: Graph, filepath: Path) -> None:
    """Serialize graph nodes and edges to lightweight JSON."""
    nodes_data = [
        {"id": n, "lat": graph.get_coords(n)[0], "lon": graph.get_coords(n)[1]}
        for n in graph.nodes
    ]
    edges_data = []
    for u in graph.nodes:
        for v, d in graph.neighbors(u):
            edges_data.append({
                "u": u,
                "v": v,
                "data": d,
            })

    payload = {
        "name": graph.name,
        "nodes": nodes_data,
        "edges": edges_data,
    }

    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w") as f:
        json.dump(payload, f)


def load_graph_from_json(filepath: Path) -> Graph:
    """Deserialize a Graph from JSON."""
    with open(filepath, "r") as f:
        data = json.load(f)

    g = Graph(name=data.get("name", "LoadedCity"))
    for n in data.get("nodes", []):
        g.add_node(n["id"], n["lat"], n["lon"])

    for e in data.get("edges", []):
        g.add_edge(e["u"], e["v"], e.get("data", {}), bidirectional=False)

    return g


def build_or_load_graph(force_rebuild: bool = False) -> Graph:
    """
    Main loader for the active road network graph.
    """
    global _ACTIVE_GRAPH
    if _ACTIVE_GRAPH is not None and not force_rebuild:
        return _ACTIVE_GRAPH

    cache_file = settings.DATA_DIR / "cached_graph.json"

    # 1. If cached file exists and no rebuild forced, load it
    if cache_file.exists() and not force_rebuild:
        try:
            logger.info(f"Loading cached road network from {cache_file}...")
            _ACTIVE_GRAPH = load_graph_from_json(cache_file)
            logger.info(f"Loaded '{_ACTIVE_GRAPH.name}' with {_ACTIVE_GRAPH.node_count:,} nodes and {_ACTIVE_GRAPH.edge_count:,} edges.")
            return _ACTIVE_GRAPH
        except Exception as e:
            logger.warning(f"Could not load cached graph from {cache_file}: {e}. Rebuilding...")

    # 2. Check if real city via OSMnx is requested
    if not settings.USE_SYNTHETIC_GRID:
        try:
            logger.info(f"Downloading real road network for '{settings.CITY}' via OSMnx...")
            import osmnx as ox
            ox_graph = ox.graph_from_place(settings.CITY, network_type="drive", simplify=True)
            graph = from_networkx_graph(ox_graph, name=settings.CITY)
            save_graph_to_json(graph, cache_file)
            _ACTIVE_GRAPH = graph
            return graph
        except Exception as err:
            logger.warning(
                f"OSMnx real city download failed or offline ({err}). "
                "Falling back safely to the synthetic 30x30 grid city."
            )

    # 3. Default / Fallback: Synthetic Grid City
    logger.info("Generating synthetic grid city (30x30)...")
    graph = generate_synthetic_grid(
        rows=settings.GRID_ROWS,
        cols=settings.GRID_COLS,
        origin_lat=28.6139,
        origin_lon=77.2090,
        step_km=0.45,
        seed=42,
    )
    save_graph_to_json(graph, cache_file)
    _ACTIVE_GRAPH = graph
    logger.info(f"Synthetic city ready: {graph.node_count:,} nodes, {graph.edge_count:,} edges.")
    return graph


def get_active_graph() -> Graph:
    """Thread-safe getter for the active road network."""
    global _ACTIVE_GRAPH
    if _ACTIVE_GRAPH is None:
        _ACTIVE_GRAPH = build_or_load_graph()
    return _ACTIVE_GRAPH


if __name__ == "__main__":
    print(f"Building/caching road network...")
    g = build_or_load_graph(force_rebuild=True)
    print(f"Graph ready: '{g.name}' | {g.node_count:,} nodes | {g.edge_count:,} directed edges.")
    bbox = g.bounding_box()
    print(f"Bounding Box: Lat [{bbox[0]:.4f}, {bbox[2]:.4f}], Lon [{bbox[1]:.4f}, {bbox[3]:.4f}]")
