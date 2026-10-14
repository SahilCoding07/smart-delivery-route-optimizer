"""
Multi-Stop Route Optimizer (Travelling Salesperson Problem / TSP).

What it does:
    Computes the optimal ordering for visiting a depot and a set of delivery stops.
    1. Computes the all-pairs shortest path matrix between all stops using Dijkstra or A*.
    2. Builds an initial tour using the greedy Nearest Neighbour construction heuristic.
    3. Iteratively refines the tour using the 2-opt local search improvement heuristic.
    4. For small inputs (N <= 9), an exact brute-force solver is available to benchmark
       the heuristic's optimality gap.

Time Complexity:
    - Distance Matrix: O(K * (V + E) log V) where K is number of stops.
    - Nearest Neighbour: O(K^2)
    - 2-Opt Improvement: O(iters * K^2) where each pass evaluates all non-adjacent edge swaps.
    - Brute Force Exact: O((K - 1)!) - feasible only for K <= 9.

Space Complexity:
    - O(K^2) for storing pairwise distances and leg paths.

When to use:
    When a delivery driver needs to visit multiple customer addresses starting and
    returning to a central depot in the shortest total distance or travel time.
"""

from __future__ import annotations
import itertools
from dataclasses import dataclass, field
from typing import Any, Callable, Optional
from app.core.graph import Graph
from app.core.dijkstra import dijkstra
from app.core.astar import astar, make_haversine_heuristic

WeightFn = Callable[[Any, Any, dict[str, Any]], float]


@dataclass
class TSPResult:
    """Detailed result of multi-stop tour optimization."""
    tour: list[Any]  # e.g. [depot, stop_a, stop_b, ..., depot]
    initial_cost: float
    final_cost: float
    improvement_pct: float
    two_opt_swaps: int
    legs: list[dict[str, Any]] = field(default_factory=list)
    exact_optimal_cost: Optional[float] = None
    optimality_gap_pct: Optional[float] = None


def build_distance_matrix(
    graph: Graph,
    stop_nodes: list[Any],
    weight_fn: Optional[WeightFn] = None,
    algorithm: str = "astar",
) -> tuple[dict[tuple[Any, Any], float], dict[tuple[Any, Any], list[Any]]]:
    """
    Compute shortest path distance and intermediate path nodes between all pairs of stops.

    Parameters:
        graph: The road network graph.
        stop_nodes: List of unique node IDs (including the depot).
        weight_fn: Edge weight evaluation function.
        algorithm: 'astar' (default, faster) or 'dijkstra'.

    Returns:
        tuple of (distances_dict, paths_dict) where keys are (u, v) pairs.
    """
    dist_matrix: dict[tuple[Any, Any], float] = {}
    path_matrix: dict[tuple[Any, Any], list[Any]] = {}

    heuristic = make_haversine_heuristic() if algorithm.lower() == "astar" else None

    # Compute pairwise paths between all distinct pairs of stops
    for i, u in enumerate(stop_nodes):
        for j, v in enumerate(stop_nodes):
            if i == j:
                dist_matrix[(u, v)] = 0.0
                path_matrix[(u, v)] = [u]
            else:
                if algorithm.lower() == "dijkstra":
                    p, c, _ = dijkstra(graph, u, v, weight_fn=weight_fn)
                else:
                    p, c, _ = astar(graph, u, v, weight_fn=weight_fn, heuristic=heuristic)
                
                dist_matrix[(u, v)] = c
                path_matrix[(u, v)] = p

    return dist_matrix, path_matrix


def compute_tour_cost(tour: list[Any], dist_matrix: dict[tuple[Any, Any], float]) -> float:
    """Calculate the total cost of a closed tour (returning to start)."""
    cost = 0.0
    for i in range(len(tour) - 1):
        cost += dist_matrix[(tour[i], tour[i + 1])]
    return cost


def nearest_neighbour_tour(
    dist_matrix: dict[tuple[Any, Any], float],
    stops: list[Any],
    start_node: Any,
) -> tuple[list[Any], float]:
    """
    Construct an initial tour using the greedy Nearest Neighbour heuristic.
    Starts at start_node, repeatedly steps to the nearest unvisited stop,
    and returns to start_node at the end.

    Returns:
        (tour, total_cost)
    """
    unvisited = set(stops)
    unvisited.remove(start_node)

    current = start_node
    tour = [current]

    while unvisited:
        nearest = min(unvisited, key=lambda nxt: dist_matrix.get((current, nxt), float("inf")))
        tour.append(nearest)
        unvisited.remove(nearest)
        current = nearest

    # Return to starting depot to form a closed tour
    tour.append(start_node)
    total_cost = compute_tour_cost(tour, dist_matrix)
    return tour, total_cost


def two_opt_swap(tour: list[Any], i: int, k: int) -> list[Any]:
    """
    Perform a 2-opt reversal: reverse the order of nodes from index i to k inclusive.
    Tour format: tour[0 ... i-1] + reversed(tour[i ... k]) + tour[k+1 ... end]
    """
    new_tour = tour[:i] + tour[i : k + 1][::-1] + tour[k + 1 :]
    return new_tour


def two_opt(
    tour: list[Any],
    dist_matrix: dict[tuple[Any, Any], float],
    max_iterations: int = 500,
) -> tuple[list[Any], float, int]:
    """
    Improve an initial tour using the 2-opt local search heuristic.
    In each pass, tests all pairs of non-adjacent edges (i-1, i) and (k, k+1).
    If reversing the sub-tour between i and k reduces total distance, performs the swap.
    Repeats until no 2-opt move yields improvement (local minimum) or max_iterations reached.

    Returns:
        (best_tour, best_cost, total_swaps_made)
    """
    best_tour = list(tour)
    best_cost = compute_tour_cost(best_tour, dist_matrix)
    swaps_made = 0
    improved = True
    iteration = 0

    # Number of stops in the tour (excluding the duplicate return-to-depot end node)
    n = len(best_tour) - 1

    while improved and iteration < max_iterations:
        improved = False
        iteration += 1

        for i in range(1, n):
            for k in range(i + 1, n):
                # Current edges: (i-1 -> i) and (k -> k+1)
                u1, v1 = best_tour[i - 1], best_tour[i]
                u2, v2 = best_tour[k], best_tour[k + 1]

                current_edges_cost = dist_matrix[(u1, v1)] + dist_matrix[(u2, v2)]
                # Proposed swapped edges: (u1 -> u2) and (v1 -> v2)
                new_edges_cost = dist_matrix[(u1, u2)] + dist_matrix[(v1, v2)]

                # If the proposed edges are strictly shorter, apply the swap
                if new_edges_cost < current_edges_cost - 1e-6:
                    best_tour = two_opt_swap(best_tour, i, k)
                    best_cost = compute_tour_cost(best_tour, dist_matrix)
                    swaps_made += 1
                    improved = True
                    break
            if improved:
                break

    return best_tour, best_cost, swaps_made


def brute_force_tsp(
    dist_matrix: dict[tuple[Any, Any], float],
    stops: list[Any],
    start_node: Any,
) -> tuple[list[Any], float]:
    """
    Exact TSP solver using full permutation search.
    Used exclusively for small stop counts (N <= 9) to measure heuristic optimality.

    Returns:
        (optimal_tour, minimum_cost)
    """
    other_stops = [s for s in stops if s != start_node]
    best_tour = None
    min_cost = float("inf")

    for perm in itertools.permutations(other_stops):
        candidate_tour = [start_node] + list(perm) + [start_node]
        cost = compute_tour_cost(candidate_tour, dist_matrix)
        if cost < min_cost:
            min_cost = cost
            best_tour = candidate_tour

    return best_tour if best_tour is not None else [start_node, start_node], min_cost


def solve_tsp(
    graph: Graph,
    depot_node: Any,
    delivery_nodes: list[Any],
    weight_fn: Optional[WeightFn] = None,
    algorithm: str = "astar",
    run_exact_if_small: bool = True,
) -> TSPResult:
    """
    High-level entry point to optimize a multi-stop delivery route.

    Parameters:
        graph: Road network Graph.
        depot_node: Starting and ending node ID.
        delivery_nodes: List of stop node IDs to visit.
        weight_fn: Function to evaluate edge weights (distance or ML travel time).
        algorithm: 'astar' or 'dijkstra'.
        run_exact_if_small: If True and total stops <= 9, runs brute-force to check optimality.

    Returns:
        TSPResult with visit order, costs, improvement percentage, and per-leg paths.
    """
    all_stops = [depot_node] + [s for s in delivery_nodes if s != depot_node]

    # Handle trivial cases (0 or 1 delivery stop)
    if len(all_stops) <= 1:
        return TSPResult(
            tour=[depot_node, depot_node],
            initial_cost=0.0,
            final_cost=0.0,
            improvement_pct=0.0,
            two_opt_swaps=0,
            legs=[],
        )

    # 1. Build distance and path matrix
    dist_matrix, path_matrix = build_distance_matrix(
        graph, all_stops, weight_fn=weight_fn, algorithm=algorithm
    )

    # 2. Nearest Neighbour initial construction
    nn_tour, nn_cost = nearest_neighbour_tour(dist_matrix, all_stops, start_node=depot_node)

    # 3. 2-opt local search optimization
    opt_tour, opt_cost, swaps = two_opt(nn_tour, dist_matrix)

    # Improvement calculation
    improvement_pct = 0.0
    if nn_cost > 0:
        improvement_pct = max(0.0, ((nn_cost - opt_cost) / nn_cost) * 100.0)

    # 4. Optional brute-force exact check for small tours (N <= 9)
    exact_cost = None
    gap_pct = None
    if run_exact_if_small and len(all_stops) <= 9:
        _, exact_cost = brute_force_tsp(dist_matrix, all_stops, start_node=depot_node)
        if exact_cost > 0:
            gap_pct = max(0.0, ((opt_cost - exact_cost) / exact_cost) * 100.0)

    # 5. Assemble legs with detailed path nodes
    legs = []
    for i in range(len(opt_tour) - 1):
        u, v = opt_tour[i], opt_tour[i + 1]
        leg_cost = dist_matrix[(u, v)]
        leg_path = path_matrix.get((u, v), [u, v])
        legs.append({
            "from_node": u,
            "to_node": v,
            "cost": leg_cost,
            "path": leg_path,
        })

    return TSPResult(
        tour=opt_tour,
        initial_cost=nn_cost,
        final_cost=opt_cost,
        improvement_pct=improvement_pct,
        two_opt_swaps=swaps,
        legs=legs,
        exact_optimal_cost=exact_cost,
        optimality_gap_pct=gap_pct,
    )
