"""
Graph Data Structure and City Road Network Loader.

What it does:
    Represents a directed or undirected road network using an adjacency list.
    Stores geospatial coordinates (latitude, longitude) for each node and road
    attributes (length_km, road_type, max_speed_kmh, etc.) on each edge.
    Provides methods to find the nearest node to an arbitrary coordinate,
    query neighbors, and construct synthetic grid cities for offline testing.

Time Complexity:
    - Add node / Add edge: O(1)
    - Query neighbors: O(deg(u)) where deg(u) is the out-degree of node u
    - Query coordinates: O(1)
    - Nearest node: O(V) via linear scan.
      NOTE: In production, replacing this with a KD-Tree or R-tree spatial index
      reduces nearest neighbor lookup from O(V) to O(log V). Linear scan is used here
      for simplicity, minimal dependencies, and clarity in interviews.

Space Complexity:
    - O(V + E) where V is the number of vertices and E is the number of edges.

When to use:
    The primary substrate for all routing algorithms (Dijkstra, A*, TSP) and ML edge
    weight evaluation across the city road network.
"""

from __future__ import annotations
import math
import random
from typing import Any, Optional


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points on the Earth
    using the Haversine formula.

    Formula:
        a = sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2)
        c = 2 * atan2(√a, √(1−a))
        d = R * c
    where R = 6371.0 km (mean Earth radius).
    """
    R = 6371.0  # Earth radius in kilometers

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


class Graph:
    """
    Spatial Adjacency-List Graph for Road Networks.
    Nodes are identified by arbitrary hashable IDs (ints or strings).
    """

    def __init__(self, name: str = "RoadNetwork") -> None:
        self.name: str = name
        # adjacency list: node_id -> list of (neighbor_id, edge_data_dict)
        self._adj: dict[Any, list[tuple[Any, dict[str, Any]]]] = {}
        # node coordinates: node_id -> (lat, lon)
        self._coords: dict[Any, tuple[float, float]] = {}

    def add_node(self, node_id: Any, lat: float, lon: float) -> None:
        """Register a node with its geographical coordinates."""
        if node_id not in self._adj:
            self._adj[node_id] = []
        self._coords[node_id] = (float(lat), float(lon))

    def add_edge(
        self,
        u: Any,
        v: Any,
        edge_data: Optional[dict[str, Any]] = None,
        bidirectional: bool = False,
    ) -> None:
        """
        Add a directed edge u -> v with edge attributes.
        If bidirectional=True, also adds v -> u.
        """
        if u not in self._adj:
            self._adj[u] = []
        if v not in self._adj:
            self._adj[v] = []

        data = edge_data.copy() if edge_data is not None else {}

        # If length_km is not provided, calculate it using haversine if coords exist
        if "length_km" not in data and u in self._coords and v in self._coords:
            u_lat, u_lon = self._coords[u]
            v_lat, v_lon = self._coords[v]
            data["length_km"] = haversine_distance_km(u_lat, u_lon, v_lat, v_lon)

        self._adj[u].append((v, data))

        if bidirectional:
            back_data = data.copy()
            self._adj[v].append((u, back_data))

    def neighbors(self, node_id: Any) -> list[tuple[Any, dict[str, Any]]]:
        """Return list of (neighbor_id, edge_data) for outbound edges from node_id."""
        return self._adj.get(node_id, [])

    def get_coords(self, node_id: Any) -> tuple[float, float]:
        """Return (lat, lon) for a node. Raises KeyError if node doesn't exist."""
        return self._coords[node_id]

    def has_node(self, node_id: Any) -> bool:
        """Check if node_id exists in the graph."""
        return node_id in self._coords

    @property
    def nodes(self) -> list[Any]:
        """Return all node IDs in the graph."""
        return list(self._coords.keys())

    @property
    def node_count(self) -> int:
        """Total number of nodes in the graph."""
        return len(self._coords)

    @property
    def edge_count(self) -> int:
        """Total number of directed edges in the graph."""
        return sum(len(edges) for edges in self._adj.values())

    def bounding_box(self) -> tuple[float, float, float, float]:
        """
        Return the geographical bounding box of all nodes:
        (min_lat, min_lon, max_lat, max_lon).
        """
        if not self._coords:
            return (0.0, 0.0, 0.0, 0.0)
        lats = [c[0] for c in self._coords.values()]
        lons = [c[1] for c in self._coords.values()]
        return (min(lats), min(lons), max(lats), max(lons))

    def nearest_node(self, lat: float, lon: float) -> Any:
        """
        Find the node closest to the given (lat, lon) coordinates using Haversine distance.
        Linear scan O(V).

        KD-Tree Upgrade Note:
            For very large real-world graphs (e.g., > 100,000 nodes),
            we can build a scipy.spatial.cKDTree over projected UTM coordinates
            or 3D Cartesian coordinates (x = R*cos(lat)*cos(lon), y = R*cos(lat)*sin(lon), z = R*sin(lat))
            to answer nearest_node queries in O(log V) time.
        """
        if not self._coords:
            raise ValueError("Graph has no nodes to search.")

        best_node = None
        min_dist = float("inf")

        for node_id, (n_lat, n_lon) in self._coords.items():
            dist = haversine_distance_km(lat, lon, n_lat, n_lon)
            if dist < min_dist:
                min_dist = dist
                best_node = node_id

        return best_node


def generate_synthetic_grid(
    rows: int = 30,
    cols: int = 30,
    origin_lat: float = 28.6139,
    origin_lon: float = 77.2090,
    step_km: float = 0.5,
    seed: int = 42,
) -> Graph:
    """
    Generate a deterministic synthetic grid city road network.

    Parameters:
        rows, cols: Dimensions of the grid (default 30x30 = 900 nodes).
        origin_lat, origin_lon: Coordinates of bottom-left corner (default New Delhi, India).
        step_km: Distance in km between adjacent grid intersections.
        seed: Random seed for reproducible road type and turn assignments.

    Returns:
        Graph: Fully connected grid road network with realistic road metadata.
    """
    rng = random.Random(seed)
    graph = Graph(name=f"SyntheticGrid_{rows}x{cols}")

    # Conversion factor: 1 degree latitude ~ 111 km
    # 1 degree longitude ~ 111 km * cos(lat)
    lat_step = step_km / 111.0
    lon_step = step_km / (111.0 * math.cos(math.radians(origin_lat)))

    # 1. Create nodes
    for r in range(rows):
        for c in range(cols):
            node_id = f"n_{r}_{c}"
            lat = origin_lat + r * lat_step
            lon = origin_lon + c * lon_step
            graph.add_node(node_id, lat, lon)

    # Road types distribution:
    # 70% residential (30 km/h)
    # 20% primary arterial (50 km/h)
    # 10% highway (70 km/h)
    road_types = ["residential", "primary", "highway"]
    road_weights = [0.70, 0.20, 0.10]
    speed_map = {
        "residential": 30.0,
        "primary": 50.0,
        "highway": 70.0,
    }

    # 2. Create edges (horizontal & vertical connections)
    for r in range(rows):
        for c in range(cols):
            curr_id = f"n_{r}_{c}"

            # Horizontal neighbor (east)
            if c + 1 < cols:
                east_id = f"n_{r}_{c + 1}"
                rtype = rng.choices(road_types, weights=road_weights)[0]
                edge_data = {
                    "road_type": rtype,
                    "max_speed_kmh": speed_map[rtype],
                    "num_turns": rng.choice([0, 1, 2]),
                    "length_km": step_km,
                }
                graph.add_edge(curr_id, east_id, edge_data, bidirectional=True)

            # Vertical neighbor (north)
            if r + 1 < rows:
                north_id = f"n_{r + 1}_{c}"
                rtype = rng.choices(road_types, weights=road_weights)[0]
                edge_data = {
                    "road_type": rtype,
                    "max_speed_kmh": speed_map[rtype],
                    "num_turns": rng.choice([0, 1, 2]),
                    "length_km": step_km,
                }
                graph.add_edge(curr_id, north_id, edge_data, bidirectional=True)

    return graph


def from_networkx_graph(nx_graph: Any, name: str = "OSM_City") -> Graph:
    """
    Convert a NetworkX MultiDiGraph (e.g. from OSMnx) into our custom Graph class.
    Extracts node lat/lon and edge length_km, road_type (highway tag).
    """
    graph = Graph(name=name)

    # Extract nodes
    for node_id, data in nx_graph.nodes(data=True):
        lat = data.get("y", 0.0)
        lon = data.get("x", 0.0)
        graph.add_node(node_id, lat, lon)

    # Extract edges
    for u, v, data in nx_graph.edges(data=True):
        # Length in meters in OSMnx -> convert to km
        length_m = data.get("length", 100.0)
        length_km = length_m / 1000.0

        # Highway tag in OSM can be a string or list
        highway_tag = data.get("highway", "residential")
        if isinstance(highway_tag, list):
            highway_tag = highway_tag[0] if highway_tag else "residential"

        # Speed limit
        max_speed = data.get("maxspeed", 30.0)
        if isinstance(max_speed, list):
            max_speed = max_speed[0]
        try:
            max_speed_kmh = float(max_speed)
        except (ValueError, TypeError):
            max_speed_kmh = 30.0

        edge_data = {
            "length_km": length_km,
            "road_type": str(highway_tag),
            "max_speed_kmh": max_speed_kmh,
            "num_turns": 1,
        }
        graph.add_edge(u, v, edge_data, bidirectional=False)

    return graph
