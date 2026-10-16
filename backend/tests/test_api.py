"""
Integration and End-to-End Tests for RouteWise FastAPI Endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.build_graph import get_active_graph

client = TestClient(app)


def test_root_and_health_endpoints():
    res_root = client.get("/")
    assert res_root.status_code == 200
    assert "documentation" in res_root.json()

    res_health = client.get("/api/health")
    assert res_health.status_code == 200
    data = res_health.json()
    assert data["status"] == "healthy"
    assert data["app"] == "RouteWise"


def test_graph_info_and_nodes_endpoints():
    res = client.get("/api/graph/info")
    assert res.status_code == 200
    info = res.json()
    assert info["node_count"] > 0
    assert info["edge_count"] > 0
    assert "bounding_box" in info

    res_nodes = client.get("/api/graph/nodes?limit=10")
    assert res_nodes.status_code == 200
    nodes = res_nodes.json()
    assert len(nodes) == 10
    assert "lat" in nodes[0]
    assert "lon" in nodes[0]


def test_eta_predict_endpoint():
    payload = {
        "distance_km": 5.2,
        "road_type": "primary",
        "num_turns": 2,
        "departure_time": "2026-10-16T18:00:00Z",
        "weather": "rain",
    }
    res = client.post("/api/eta/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["predicted_travel_time_minutes"] > 0.0
    assert data["effective_speed_kmh"] > 0.0
    assert "model_used" in data


def test_ml_metrics_endpoint():
    res = client.get("/api/ml/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "Random Forest" in data["models"]
    assert data["champion"] == "Random Forest"


def test_benchmark_endpoint():
    res = client.get("/api/benchmark/run?pairs=10")
    assert res.status_code == 200
    bench = res.json()
    assert bench["num_pairs"] == 10
    assert bench["dijkstra_avg_nodes"] >= bench["astar_avg_nodes"]


def test_route_optimize_happy_path():
    graph = get_active_graph()
    bbox = graph.bounding_box()

    # Pick valid coordinates within bounding box
    depot_lat = bbox[0] + 0.01
    depot_lon = bbox[1] + 0.01

    payload = {
        "depot": {"lat": depot_lat, "lon": depot_lon},
        "stops": [
            {"id": "stop_1", "name": "Pharmacy Alpha", "lat": depot_lat + 0.01, "lon": depot_lon + 0.01},
            {"id": "stop_2", "name": "Grocery Beta", "lat": depot_lat + 0.02, "lon": depot_lon + 0.01},
            {"id": "stop_3", "name": "Cafe Gamma", "lat": depot_lat + 0.01, "lon": depot_lon + 0.02},
        ],
        "departure_time": "2026-10-16T14:00:00Z",
        "weather": "clear",
        "algorithm": "astar",
        "use_ml": True,
    }

    res = client.post("/api/route/optimize", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert len(data["ordered_stops"]) == 5  # depot + 3 stops + return to depot
    assert len(data["legs"]) == 4           # 4 legs forming a closed loop
    assert data["total_distance_km"] > 0.0
    assert data["total_time_minutes"] > 0.0
    assert data["algorithm_used"] == "ASTAR"
    assert data["ml_applied"] is True

    # Check that legs have polylines
    for leg in data["legs"]:
        assert len(leg["polyline_coords"]) >= 2


def test_route_optimize_out_of_bounds_error():
    payload = {
        "depot": {"lat": 0.0, "lon": 0.0},  # Middle of Atlantic Ocean, outside city
        "stops": [
            {"id": "s1", "name": "Faraway Stop", "lat": 1.0, "lon": 1.0},
        ],
    }
    res = client.post("/api/route/optimize", json=payload)
    assert res.status_code == 422
    assert "outside the active road network bounding box" in res.json()["detail"]


def test_route_optimize_duplicate_stop_ids():
    payload = {
        "depot": {"lat": 28.62, "lon": 77.21},
        "stops": [
            {"id": "duplicate_id", "name": "Stop 1", "lat": 28.63, "lon": 77.22},
            {"id": "duplicate_id", "name": "Stop 2", "lat": 28.64, "lon": 77.23},
        ],
    }
    res = client.post("/api/route/optimize", json=payload)
    assert res.status_code == 422
