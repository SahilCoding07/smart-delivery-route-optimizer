"""
Phase 1 Benchmark: Performance and Nodes Explored (Dijkstra vs A*).
Runs on a 30x30 synthetic city grid (900 intersections, 3480 directed edges)
over 100 randomly sampled origin-destination pairs.
"""

import time
import random
from app.core.graph import generate_synthetic_grid
from app.core.dijkstra import dijkstra
from app.core.astar import astar, make_haversine_heuristic


def run_benchmark(num_trials: int = 100):
    print("=" * 65)
    print("RouteWise Phase 1 Benchmark: Dijkstra vs. A* Search")
    print("=" * 65)

    print("\n1. Generating Synthetic City Grid (30x30 = 900 nodes)...")
    grid = generate_synthetic_grid(rows=30, cols=30, step_km=0.5, seed=42)
    print(f"   Nodes: {grid.node_count:,} | Directed Edges: {grid.edge_count:,}")

    rng = random.Random(2026)
    nodes = grid.nodes
    pairs = [(rng.choice(nodes), rng.choice(nodes)) for _ in range(num_trials)]

    print(f"\n2. Executing {num_trials} shortest-path queries across random pairs...\n")

    dijk_times = []
    dijk_nodes = []
    astar_times = []
    astar_nodes = []

    heuristic = make_haversine_heuristic()

    for src, tgt in pairs:
        # Dijkstra
        t0 = time.perf_counter()
        _, d_cost, d_exp = dijkstra(grid, src, tgt)
        t1 = time.perf_counter()
        dijk_times.append((t1 - t0) * 1000.0)  # ms
        dijk_nodes.append(d_exp)

        # A*
        t0 = time.perf_counter()
        _, a_cost, a_exp = astar(grid, src, tgt, heuristic=heuristic)
        t1 = time.perf_counter()
        astar_times.append((t1 - t0) * 1000.0)  # ms
        astar_nodes.append(a_exp)

        assert abs(d_cost - a_cost) < 1e-4

    avg_dijk_time = sum(dijk_times) / len(dijk_times)
    avg_dijk_nodes = sum(dijk_nodes) / len(dijk_nodes)
    avg_astar_time = sum(astar_times) / len(astar_times)
    avg_astar_nodes = sum(astar_nodes) / len(astar_nodes)

    node_reduction = (1.0 - (avg_astar_nodes / avg_dijk_nodes)) * 100.0
    time_reduction = (1.0 - (avg_astar_time / avg_dijk_time)) * 100.0

    print(f"{'Metric':<28} | {'Dijkstra':<15} | {'A*':<15} | {'Improvement':<12}")
    print("-" * 75)
    print(f"{'Avg Nodes Explored':<28} | {avg_dijk_nodes:<15.1f} | {avg_astar_nodes:<15.1f} | {node_reduction:>+8.1f}%")
    print(f"{'Avg Latency (ms)':<28} | {avg_dijk_time:<15.2f} | {avg_astar_time:<15.2f} | {time_reduction:>+8.1f}%")
    print("-" * 75)
    print("\nAdmissibility Conclusion:")
    print("  ✓ A* consistently matches Dijkstra's optimal path cost 100% of the time.")
    print(f"  ✓ A* explores {node_reduction:.1f}% fewer nodes on average due to the admissible Haversine heuristic.")
    print("=" * 65)


if __name__ == "__main__":
    run_benchmark(num_trials=100)
