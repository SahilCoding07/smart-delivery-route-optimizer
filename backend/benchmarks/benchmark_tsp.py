"""
Phase 2 Benchmark: Multi-Stop Routing & 2-Opt Optimization Benchmark.
Demonstrates Nearest Neighbour construction, 2-opt local search improvement,
and comparison against brute-force exact optimal.
"""

from app.core.graph import generate_synthetic_grid
from app.core.tsp import solve_tsp


def run_tsp_benchmark():
    print("=" * 70)
    print("RouteWise Phase 2 Benchmark: Multi-Stop Route Optimization (TSP)")
    print("=" * 70)

    grid = generate_synthetic_grid(rows=20, cols=20, step_km=0.5, seed=42)

    # Scenario 1: Small delivery run (7 stops) compared against brute-force global optimum
    depot = "n_0_0"
    small_stops = ["n_3_2", "n_7_8", "n_2_15", "n_12_4", "n_15_12", "n_18_3"]

    print(f"\nScenario 1: Small Batch ({len(small_stops)} delivery stops + 1 depot)")
    res_small = solve_tsp(grid, depot, small_stops, algorithm="astar", run_exact_if_small=True)

    print(f"  Initial Tour (Nearest Neighbour) : {res_small.initial_cost:.2f} km")
    print(f"  Optimized Tour (2-Opt Refined)   : {res_small.final_cost:.2f} km")
    print(f"  2-Opt Improvement                : {res_small.improvement_pct:.1f}% ({res_small.two_opt_swaps} edge swaps)")
    if res_small.exact_optimal_cost is not None:
        print(f"  Brute-Force Global Optimum       : {res_small.exact_optimal_cost:.2f} km")
        print(f"  Optimality Gap                   : {res_small.optimality_gap_pct:.2f}% (Heuristic vs Exact)")

    # Scenario 2: Realistic medium delivery run (15 stops)
    import random
    rng = random.Random(999)
    medium_stops = rng.sample([n for n in grid.nodes if n != depot], 15)

    print(f"\nScenario 2: Commercial Delivery Run (15 stops across city)")
    res_med = solve_tsp(grid, depot, medium_stops, algorithm="astar", run_exact_if_small=False)

    print(f"  Initial Tour (Nearest Neighbour) : {res_med.initial_cost:.2f} km")
    print(f"  Optimized Tour (2-Opt Refined)   : {res_med.final_cost:.2f} km")
    print(f"  2-Opt Improvement                : {res_med.improvement_pct:.1f}% ({res_med.two_opt_swaps} edge swaps)")
    print(f"  Total Legs Generated             : {len(res_med.legs)}")
    print("=" * 70)


if __name__ == "__main__":
    run_tsp_benchmark()
