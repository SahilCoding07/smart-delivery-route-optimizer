"""
Validation of Dijkstra and A* against NetworkX ground truth on 50 random node pairs.
"""

import random
import networkx as nx
import pytest
from app.core.graph import generate_synthetic_grid
from app.core.dijkstra import dijkstra
from app.core.astar import astar, make_haversine_heuristic


def build_corresponding_networkx(grid) -> nx.DiGraph:
    """Build a NetworkX DiGraph matching our custom Graph structure and edge weights."""
    nx_g = nx.DiGraph()
    for node in grid.nodes:
        lat, lon = grid.get_coords(node)
        nx_g.add_node(node, y=lat, x=lon)

    for u in grid.nodes:
        for v, data in grid.neighbors(u):
            nx_g.add_edge(u, v, weight=data["length_km"], **data)

    return nx_g


def test_dijkstra_and_astar_vs_networkx_50_pairs():
    """
    Core correctness test:
    Verify that our from-scratch Dijkstra and A* implementations produce
    the EXACT same optimal cost as NetworkX's shortest path algorithm
    across 50 random source-target pairs in a synthetic city grid.
    """
    grid = generate_synthetic_grid(rows=20, cols=20, step_km=0.5, seed=42)
    nx_g = build_corresponding_networkx(grid)
    all_nodes = grid.nodes

    rng = random.Random(1337)
    sampled_pairs = [
        (rng.choice(all_nodes), rng.choice(all_nodes))
        for _ in range(50)
    ]

    total_dijkstra_explored = 0
    total_astar_explored = 0

    for source, target in sampled_pairs:
        # 1. Ground truth from NetworkX
        nx_cost = nx.shortest_path_length(nx_g, source=source, target=target, weight="weight")
        nx_path = nx.shortest_path(nx_g, source=source, target=target, weight="weight")

        # 2. Our Dijkstra
        dijk_path, dijk_cost, dijk_explored = dijkstra(grid, source, target)
        total_dijkstra_explored += dijk_explored

        # 3. Our A*
        astar_path, astar_cost, astar_explored = astar(
            grid,
            source,
            target,
            heuristic=make_haversine_heuristic(),
        )
        total_astar_explored += astar_explored

        # Verify optimal path costs match NetworkX
        assert dijk_cost == pytest.approx(nx_cost, rel=1e-5), (
            f"Dijkstra cost {dijk_cost} differs from NetworkX {nx_cost} for {source}->{target}"
        )
        assert astar_cost == pytest.approx(nx_cost, rel=1e-5), (
            f"A* cost {astar_cost} differs from NetworkX {nx_cost} for {source}->{target}"
        )

        # Verify path validity (consecutive nodes must be connected)
        for path in (dijk_path, astar_path):
            assert path[0] == source
            assert path[-1] == target
            for i in range(len(path) - 1):
                u, v = path[i], path[i + 1]
                u_neighbors = [nbr for nbr, _ in grid.neighbors(u)]
                assert v in u_neighbors, f"Invalid edge {u} -> {v} in path"

    # Verify that A* is more targeted: on average it explores fewer nodes than Dijkstra
    assert total_astar_explored <= total_dijkstra_explored
    ratio = total_astar_explored / total_dijkstra_explored
    print(f"\n[Benchmark] 50 Pairs Explored Nodes - Dijkstra: {total_dijkstra_explored}, A*: {total_astar_explored} (A* explored {ratio:.1%} of Dijkstra)")


def test_algorithm_edge_cases():
    grid = generate_synthetic_grid(rows=5, cols=5, seed=99)
    node = "n_0_0"

    # Same source and target
    p_dijk, c_dijk, exp_dijk = dijkstra(grid, node, node)
    assert p_dijk == [node]
    assert c_dijk == 0.0
    assert exp_dijk == 1

    p_ast, c_ast, exp_ast = astar(grid, node, node)
    assert p_ast == [node]
    assert c_ast == 0.0
    assert exp_ast == 1

    # Non-existent node
    p_err, c_err, _ = dijkstra(grid, "non_existent", node)
    assert p_err == []
    assert c_err == float("inf")
