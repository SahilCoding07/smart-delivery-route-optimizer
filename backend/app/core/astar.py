"""
A* (A-Star) Directed Heuristic Shortest Path Algorithm.

What it does:
    Finds the shortest path between a source node and a target node in a graph.
    A* guides the search towards the target using an evaluation function:
        f(n) = g(n) + h(n)
    where:
        g(n) is the exact known cost from source to node n.
        h(n) is the heuristic estimate of the cost from node n to the target.

Why Admissibility Matters:
    A heuristic h(n) is admissible if it NEVER overestimates the true minimal cost h*(n)
    to reach the target:
        h(n) <= h*(n) for all nodes n.
    If h(n) were to overestimate (e.g., estimating 10 km when the true road distance is 6 km),
    the search could prematurely discard the true shortest path and settle for a suboptimal one,
    destroying the optimality guarantee of the algorithm.
    Furthermore, because our haversine distance heuristic satisfies the triangle inequality:
        h(n) <= cost(n, p) + h(p)
    it is 'monotone' (consistent), guaranteeing that the first time a node is popped
    from the priority queue, its g-score is provably optimal.

Heuristic Formulation:
    - When edge weights represent distance (km):
        h(n) = haversine_distance_km(n, target)
        Since the great-circle arc is the shortest path on a sphere, no road route can
        be shorter than haversine distance. Therefore, h(n) <= true_road_distance, perfectly admissible.
    - When edge weights represent travel time (minutes):
        h(n) = (haversine_distance_km(n, target) / v_max_kmh) * 60.0
        where v_max_kmh is the maximum conceivable speed across the entire network (e.g. 80 km/h).
        Since no vehicle can travel faster than v_max, time is >= dist / v_max, so h(n) <= true_time.

Time Complexity:
    - Worst case: O((V + E) * log V), identical to Dijkstra when h(n) = 0.
    - Typical case: Significantly faster in practice because the search is directed in an ellipse
      towards the target, visiting far fewer nodes than Dijkstra's circular wave.

Space Complexity:
    - O(V) for g_score, f_score, predecessor maps, and the Min-Heap.

When to use:
    When routing point-to-point where coordinate geometries exist, as A* drastically
    reduces nodes explored compared to uninformed Dijkstra search.
"""

from typing import Any, Callable, Optional
from app.core.graph import Graph, haversine_distance_km
from app.core.heap import MinHeap

WeightFn = Callable[[Any, Any, dict[str, Any]], float]
HeuristicFn = Callable[[Graph, Any, Any], float]


def default_weight_fn(u: Any, v: Any, edge_data: dict[str, Any]) -> float:
    """Default edge weight: physical road length in kilometers."""
    return float(edge_data.get("length_km", 1.0))


def make_haversine_heuristic(v_max_kmh: Optional[float] = None) -> HeuristicFn:
    """
    Construct an admissible heuristic function.
    
    If v_max_kmh is provided, returns estimated travel time in minutes:
        (haversine_km / v_max_kmh) * 60.0
    Otherwise, returns estimated distance in kilometers:
        haversine_km
    """
    def heuristic(graph: Graph, node: Any, target: Any) -> float:
        lat1, lon1 = graph.get_coords(node)
        lat2, lon2 = graph.get_coords(target)
        dist_km = haversine_distance_km(lat1, lon1, lat2, lon2)
        
        if v_max_kmh is not None and v_max_kmh > 0:
            # Convert hours to minutes
            return (dist_km / v_max_kmh) * 60.0
        return dist_km

    return heuristic


def astar(
    graph: Graph,
    source: Any,
    target: Any,
    weight_fn: Optional[WeightFn] = None,
    heuristic: Optional[HeuristicFn] = None,
) -> tuple[list[Any], float, int]:
    """
    Find the shortest path from source to target using A* search.

    Parameters:
        graph: The road network Graph.
        source: Starting node ID.
        target: Destination node ID.
        weight_fn: Edge weight function (u, v, edge_data) -> cost.
        heuristic: Heuristic function (graph, u, target) -> estimated cost to target.

    Returns:
        tuple of:
            - path: list of node IDs from source to target inclusive (empty if unreachable)
            - total_cost: exact accumulated g-score along path (float('inf') if unreachable)
            - nodes_explored: total number of vertices settled (popped from min-heap)
    """
    if not graph.has_node(source) or not graph.has_node(target):
        return ([], float("inf"), 0)

    if source == target:
        return ([source], 0.0, 1)

    if weight_fn is None:
        weight_fn = default_weight_fn

    if heuristic is None:
        heuristic = make_haversine_heuristic()

    # g_score: exact shortest cost found so far from source to n
    g_score: dict[Any, float] = {source: 0.0}
    
    # Predecessor map for path reconstruction
    pred: dict[Any, Any] = {}
    
    # Priority Queue containing (f_score, node)
    pq: MinHeap[Any] = MinHeap()
    h_source = heuristic(graph, source, target)
    pq.push(source, h_source)

    nodes_explored = 0
    visited: set[Any] = set()

    while not pq.is_empty():
        curr_node, curr_f = pq.pop()
        nodes_explored += 1

        if curr_node in visited:
            continue
        visited.add(curr_node)

        # Early exit: goal reached
        if curr_node == target:
            break

        curr_g = g_score[curr_node]

        # Explore outgoing edges
        for neighbor, edge_data in graph.neighbors(curr_node):
            if neighbor in visited:
                continue

            weight = weight_fn(curr_node, neighbor, edge_data)
            if weight < 0:
                raise ValueError(
                    f"A* requires non-negative weights, got {weight} for {curr_node}->{neighbor}"
                )

            tentative_g = curr_g + weight

            if tentative_g < g_score.get(neighbor, float("inf")):
                g_score[neighbor] = tentative_g
                pred[neighbor] = curr_node
                h_val = heuristic(graph, neighbor, target)
                f_val = tentative_g + h_val

                pq.push(neighbor, f_val)

    if target not in g_score or target not in pred:
        return ([], float("inf"), nodes_explored)

    # Reconstruct path
    path: list[Any] = []
    curr = target
    while curr != source:
        path.append(curr)
        curr = pred[curr]
    path.append(source)
    path.reverse()

    return (path, g_score[target], nodes_explored)
