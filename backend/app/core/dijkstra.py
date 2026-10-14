"""
Dijkstra's Single-Source Shortest Path Algorithm.

What it does:
    Computes the shortest path from a source node to a target node in a graph
    with non-negative edge weights using a priority queue (our custom Binary Min-Heap).
    Greedily visits the unvisited vertex with the smallest known distance from source,
    relaxes its outgoing edges, and terminates as soon as the target vertex is reached.

Time Complexity:
    - O((V + E) * log V)
      Every vertex is inserted and popped from the Min-Heap at most once: O(V log V).
      Every edge is examined and relaxed at most once: O(E log V).
    - V = number of vertices, E = number of directed edges.

Space Complexity:
    - O(V)
      Stores distances dict, predecessors dict, and Min-Heap nodes for up to V vertices.

When to use:
    When finding the provably optimal shortest path in a graph where edge weights are
    guaranteed to be non-negative (e.g. distances or travel times).
    Serves as the baseline graph pathfinder and ground truth for road routing.
"""

from typing import Any, Callable, Optional
from app.core.graph import Graph
from app.core.heap import MinHeap

WeightFn = Callable[[Any, Any, dict[str, Any]], float]


def default_weight_fn(u: Any, v: Any, edge_data: dict[str, Any]) -> float:
    """Default edge weight: physical road length in kilometers."""
    return float(edge_data.get("length_km", 1.0))


def dijkstra(
    graph: Graph,
    source: Any,
    target: Any,
    weight_fn: Optional[WeightFn] = None,
) -> tuple[list[Any], float, int]:
    """
    Find the shortest path from source to target using Dijkstra's algorithm.

    Parameters:
        graph: The road network Graph.
        source: Starting node ID.
        target: Destination node ID.
        weight_fn: Function (u, v, edge_data) -> float. Defaults to length_km.

    Returns:
        tuple of:
            - path: list of node IDs from source to target inclusive (empty if unreachable)
            - total_cost: total accumulated weight along path (float('inf') if unreachable)
            - nodes_explored: total number of vertices settled (popped from min-heap)
    """
    if not graph.has_node(source) or not graph.has_node(target):
        return ([], float("inf"), 0)

    if source == target:
        return ([source], 0.0, 1)

    if weight_fn is None:
        weight_fn = default_weight_fn

    # Track shortest known distance from source to each node
    dist: dict[Any, float] = {source: 0.0}
    # Predecessor map for path reconstruction
    pred: dict[Any, Any] = {}
    
    # Priority Queue containing (distance, node)
    pq: MinHeap[Any] = MinHeap()
    pq.push(source, 0.0)

    nodes_explored = 0

    while not pq.is_empty():
        curr_node, curr_dist = pq.pop()
        nodes_explored += 1

        # Early stopping: if we reached target, we have found the optimal path
        if curr_node == target:
            break

        # If a stale entry is popped (distance larger than recorded best), skip
        if curr_dist > dist.get(curr_node, float("inf")):
            continue

        # Explore outgoing edges
        for neighbor, edge_data in graph.neighbors(curr_node):
            weight = weight_fn(curr_node, neighbor, edge_data)
            if weight < 0:
                raise ValueError(
                    f"Dijkstra requires non-negative weights, got {weight} for {curr_node}->{neighbor}"
                )

            new_dist = curr_dist + weight

            if new_dist < dist.get(neighbor, float("inf")):
                dist[neighbor] = new_dist
                pred[neighbor] = curr_node
                
                # Update priority in min-heap (push or decrease_key)
                pq.push(neighbor, new_dist)

    # Check if target was reached
    if target not in dist:
        return ([], float("inf"), nodes_explored)

    # Reconstruct path from target back to source
    path: list[Any] = []
    curr = target
    while curr != source:
        path.append(curr)
        curr = pred[curr]
    path.append(source)
    path.reverse()

    return (path, dist[target], nodes_explored)
