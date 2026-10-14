"""
Tests for Multi-Stop TSP Routing:
- Nearest Neighbour heuristic
- 2-Opt local search improvement
- Brute-Force exact comparison on small stop counts
- Verification that 2-opt never yields a worse tour than Nearest Neighbour
"""

import random
import pytest
from app.core.graph import generate_synthetic_grid
from app.core.tsp import (
    build_distance_matrix,
    nearest_neighbour_tour,
    two_opt,
    brute_force_tsp,
    solve_tsp,
)


@pytest.fixture(scope="module")
def grid_city():
    return generate_synthetic_grid(rows=15, cols=15, step_km=0.5, seed=101)


def test_distance_matrix_and_tour_validity(grid_city):
    depot = "n_0_0"
    stops = ["n_2_3", "n_5_7", "n_8_2", "n_10_10"]
    all_stops = [depot] + stops

    dist_matrix, path_matrix = build_distance_matrix(grid_city, all_stops, algorithm="astar")

    for u in all_stops:
        for v in all_stops:
            assert (u, v) in dist_matrix
            assert (u, v) in path_matrix
            if u == v:
                assert dist_matrix[(u, v)] == 0.0
            else:
                assert dist_matrix[(u, v)] > 0.0
                assert path_matrix[(u, v)][0] == u
                assert path_matrix[(u, v)][-1] == v

    # Verify Nearest Neighbour tour properties
    nn_tour, nn_cost = nearest_neighbour_tour(dist_matrix, all_stops, start_node=depot)
    assert nn_tour[0] == depot
    assert nn_tour[-1] == depot
    # All intermediate stops must be visited exactly once
    assert sorted(nn_tour[:-1]) == sorted(all_stops)
    assert nn_cost > 0.0


def test_2opt_never_worse_than_nearest_neighbour(grid_city):
    """
    Core requirement:
    Across 10 distinct random multi-stop sets (ranging from 5 to 15 stops),
    verify that 2-opt cost is ALWAYS <= Nearest Neighbour cost.
    """
    rng = random.Random(2026)
    all_nodes = grid_city.nodes

    for trial in range(10):
        num_stops = rng.randint(5, 12)
        sample = rng.sample(all_nodes, num_stops)
        depot = sample[0]
        delivery_stops = sample[1:]

        result = solve_tsp(
            grid_city,
            depot_node=depot,
            delivery_nodes=delivery_stops,
            algorithm="astar",
            run_exact_if_small=False,
        )

        # 2-opt must never produce a worse tour than the initial NN tour
        assert result.final_cost <= result.initial_cost + 1e-6, (
            f"Trial {trial}: 2-opt ({result.final_cost}) is worse than NN ({result.initial_cost})"
        )
        assert result.improvement_pct >= 0.0

        # Tour must start and end at depot
        assert result.tour[0] == depot
        assert result.tour[-1] == depot

        # Tour must visit all required stops
        visited = set(result.tour[:-1])
        expected = set([depot] + delivery_stops)
        assert visited == expected


def test_brute_force_vs_heuristic_gap_small_cases(grid_city):
    """
    Optimality check:
    For small tours (N = 5 to 7 stops), compare the 2-opt tour against
    the true globally optimal tour found by exhaustive brute-force search.
    The gap must be negligible (heuristic within 5% of global optimum or exact).
    """
    rng = random.Random(777)
    all_nodes = grid_city.nodes

    for num_stops in (5, 6, 7):
        sample = rng.sample(all_nodes, num_stops)
        depot = sample[0]
        delivery_stops = sample[1:]

        result = solve_tsp(
            grid_city,
            depot_node=depot,
            delivery_nodes=delivery_stops,
            algorithm="astar",
            run_exact_if_small=True,
        )

        assert result.exact_optimal_cost is not None
        assert result.final_cost >= result.exact_optimal_cost - 1e-6
        assert result.optimality_gap_pct is not None
        # In planar/grid metrics, 2-opt is known to be within <= 3-5% of optimal
        assert result.optimality_gap_pct <= 5.0, (
            f"Optimality gap {result.optimality_gap_pct:.2f}% exceeded 5% on {num_stops} stops"
        )


def test_tsp_trivial_cases(grid_city):
    depot = "n_0_0"

    # 0 delivery stops
    res_zero = solve_tsp(grid_city, depot, [])
    assert res_zero.tour == [depot, depot]
    assert res_zero.final_cost == 0.0

    # 1 delivery stop
    res_one = solve_tsp(grid_city, depot, ["n_1_1"])
    assert res_one.tour == [depot, "n_1_1", depot]
    assert res_one.final_cost > 0.0
