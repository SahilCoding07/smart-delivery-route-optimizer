"""Tests for Graph representation, Haversine formula, and Synthetic Grid generation."""

import math
import pytest
from app.core.graph import (
    Graph,
    haversine_distance_km,
    generate_synthetic_grid,
)


def test_haversine_known_coordinates():
    # Known distance: London (51.5074° N, 0.1278° W) to Paris (48.8566° N, 2.3522° E) is ~343.5 km
    london_lat, london_lon = 51.5074, -0.1278
    paris_lat, paris_lon = 48.8566, 2.3522

    dist = haversine_distance_km(london_lat, london_lon, paris_lat, paris_lon)
    assert 340.0 < dist < 348.0

    # Distance to self is 0
    assert haversine_distance_km(london_lat, london_lon, london_lat, london_lon) == pytest.approx(0.0)


def test_graph_construction_and_neighbors():
    g = Graph("TestCity")
    g.add_node("A", 28.0, 77.0)
    g.add_node("B", 28.1, 77.1)
    g.add_node("C", 28.2, 77.2)

    g.add_edge("A", "B", {"road_type": "primary", "length_km": 15.0}, bidirectional=True)
    g.add_edge("B", "C", {"road_type": "highway", "length_km": 20.0}, bidirectional=False)

    assert g.node_count == 3
    # A->B, B->A, B->C => total 3 directed edges
    assert g.edge_count == 3

    assert g.get_coords("A") == (28.0, 77.0)
    neighbors_b = dict(g.neighbors("B"))
    assert "A" in neighbors_b
    assert "C" in neighbors_b
    assert neighbors_b["C"]["road_type"] == "highway"

    # Nearest node
    nearest = g.nearest_node(28.01, 77.01)
    assert nearest == "A"


def test_synthetic_grid_generation():
    grid = generate_synthetic_grid(rows=10, cols=10, step_km=0.5, seed=123)

    assert grid.node_count == 100
    # In a 10x10 grid with bidirectional edges:
    # Horizontal edges: 10 rows * 9 connections * 2 (bidirectional) = 180
    # Vertical edges: 9 connections * 10 cols * 2 (bidirectional) = 180
    # Total edges = 360
    assert grid.edge_count == 360

    bbox = grid.bounding_box()
    assert bbox[0] < bbox[2]  # min_lat < max_lat
    assert bbox[1] < bbox[3]  # min_lon < max_lon

    # Test nearest node within the grid
    origin_coords = grid.get_coords("n_0_0")
    assert grid.nearest_node(origin_coords[0], origin_coords[1]) == "n_0_0"
