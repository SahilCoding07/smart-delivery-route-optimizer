"""Live Algorithm Benchmark Endpoint (Dijkstra vs. A*)."""

import random
import time
from fastapi import APIRouter, Query
from app.core.build_graph import get_active_graph
from app.core.dijkstra import dijkstra
from app.core.astar import astar, make_haversine_heuristic
from app.schemas import BenchmarkResponse

router = APIRouter(prefix="/benchmark", tags=["Benchmarks"])


@router.get("/run", response_model=BenchmarkResponse, summary="Run Live Benchmark: Dijkstra vs. A*")
def run_benchmark(
    pairs: int = Query(30, ge=5, le=100, description="Number of random origin-destination pairs to test"),
) -> BenchmarkResponse:
    """
    Execute live performance benchmark comparing Dijkstra and A* across
    randomly sampled node pairs on the active road network.
    """
    graph = get_active_graph()
    nodes = graph.nodes
    rng = random.Random(42)

    sample_pairs = [(rng.choice(nodes), rng.choice(nodes)) for _ in range(pairs)]

    dijk_times = []
    dijk_nodes = []
    astar_times = []
    astar_nodes = []

    heuristic = make_haversine_heuristic()

    for src, tgt in sample_pairs:
        # Dijkstra
        t0 = time.perf_counter()
        _, _, d_exp = dijkstra(graph, src, tgt)
        t1 = time.perf_counter()
        dijk_times.append((t1 - t0) * 1000.0)
        dijk_nodes.append(d_exp)

        # A*
        t0 = time.perf_counter()
        _, _, a_exp = astar(graph, src, tgt, heuristic=heuristic)
        t1 = time.perf_counter()
        astar_times.append((t1 - t0) * 1000.0)
        astar_nodes.append(a_exp)

    avg_dijk_time = sum(dijk_times) / len(dijk_times)
    avg_dijk_nodes = sum(dijk_nodes) / len(dijk_nodes)
    avg_astar_time = sum(astar_times) / len(astar_times)
    avg_astar_nodes = sum(astar_nodes) / len(astar_nodes)

    node_reduction = (1.0 - (avg_astar_nodes / max(1.0, avg_dijk_nodes))) * 100.0
    time_reduction = (1.0 - (avg_astar_time / max(0.001, avg_dijk_time))) * 100.0

    return BenchmarkResponse(
        num_pairs=pairs,
        dijkstra_avg_time_ms=round(avg_dijk_time, 2),
        dijkstra_avg_nodes=round(avg_dijk_nodes, 1),
        astar_avg_time_ms=round(avg_astar_time, 2),
        astar_avg_nodes=round(avg_astar_nodes, 1),
        node_reduction_pct=round(node_reduction, 1),
        time_reduction_pct=round(time_reduction, 1),
    )
