"""
Tests for the Machine Learning Pipeline:
- Synthetic trip generation correctness
- Feature engineering and preprocessing
- Model inference and fallback mechanisms
- Integration into Dijkstra and A* graph routing as dynamic edge weights
"""

from datetime import datetime
import numpy as np
import pytest
from app.core.graph import generate_synthetic_grid
from app.core.dijkstra import dijkstra
from app.core.astar import astar, make_haversine_heuristic
from app.ml.data_gen import generate_trip_dataset
from app.ml.features import (
    FEATURE_COLUMNS,
    TARGET_COLUMN,
    create_feature_row,
    parse_departure_time,
)
from app.ml.predict import (
    predict_edge_time,
    make_ml_weight_fn,
    fallback_travel_time_minutes,
)


def test_data_generation_invariants():
    df = generate_trip_dataset(num_records=500, seed=42)

    assert len(df) == 500
    for col in FEATURE_COLUMNS:
        assert col in df.columns
    assert TARGET_COLUMN in df.columns

    # Invariants
    assert df["distance_km"].min() >= 0.1
    assert df["travel_time_minutes"].min() > 0.0
    assert not df.isnull().values.any()

    # Reproducibility check with same seed
    df2 = generate_trip_dataset(num_records=500, seed=42)
    assert np.allclose(df["travel_time_minutes"], df2["travel_time_minutes"])


def test_departure_time_parsing():
    # Peak weekday morning: 8:30 AM on Monday (day=0)
    dt_peak = datetime(2026, 10, 19, 8, 30)
    hour, day, is_weekend, is_peak = parse_departure_time(dt_peak)
    assert hour == 8
    assert day == 0
    assert is_weekend == 0
    assert is_peak == 1

    # Off-peak weekend afternoon: 2:00 PM on Saturday (day=5)
    dt_weekend = datetime(2026, 10, 24, 14, 0)
    hour, day, is_weekend, is_peak = parse_departure_time(dt_weekend)
    assert hour == 14
    assert day == 5
    assert is_weekend == 1
    assert is_peak == 0


def test_feature_row_matches_schema():
    row = create_feature_row(
        distance_km=4.5,
        road_type="primary",
        num_turns=3,
        departure_time="2026-10-15T09:00:00",
        weather="rain",
    )
    assert list(row.columns) == FEATURE_COLUMNS
    assert row["road_type"].iloc[0] == "primary"
    assert row["weather"].iloc[0] == "rain"
    assert row["is_peak_hour"].iloc[0] == 1


def test_predict_fallback_when_model_is_none():
    t_clear = fallback_travel_time_minutes(distance_km=10.0, road_type="primary", is_peak=False, is_rain=False)
    t_rain = fallback_travel_time_minutes(distance_km=10.0, road_type="primary", is_peak=False, is_rain=True)
    t_peak_rain = fallback_travel_time_minutes(distance_km=10.0, road_type="primary", is_peak=True, is_rain=True)

    assert t_clear > 0
    # Rain should be slower than clear
    assert t_rain > t_clear
    # Peak + rain should be slowest
    assert t_peak_rain > t_rain


def test_graph_routing_with_ml_edge_weights():
    """
    Core verification:
    Verify that make_ml_weight_fn works as a valid weight_fn inside Dijkstra and A*.
    Also verify that adverse conditions (peak hour + rain) strictly increase the total travel time.
    """
    grid = generate_synthetic_grid(rows=10, cols=10, step_km=0.5, seed=123)
    start_node = "n_0_0"
    end_node = "n_9_9"

    # Off-peak clear conditions (Sunday 2 PM)
    weight_fn_normal = make_ml_weight_fn(
        departure_time=datetime(2026, 10, 18, 14, 0),
        weather="clear",
    )

    # Peak rush hour + heavy rain (Tuesday 8:30 AM)
    weight_fn_congestion = make_ml_weight_fn(
        departure_time=datetime(2026, 10, 20, 8, 30),
        weather="rain",
    )

    # 1. Route under normal conditions
    p_norm, time_norm, exp_norm = dijkstra(grid, start_node, end_node, weight_fn=weight_fn_normal)
    assert len(p_norm) > 0
    assert time_norm > 0.0

    # 2. Route under congested conditions
    p_cong, time_cong, exp_cong = dijkstra(grid, start_node, end_node, weight_fn=weight_fn_congestion)
    assert len(p_cong) > 0
    assert time_cong > time_norm, f"Congested time ({time_cong:.2f}) should be > normal time ({time_norm:.2f})"

    # 3. Test A* with admissible time heuristic
    heuristic = make_haversine_heuristic(v_max_kmh=80.0)
    p_astar, time_astar, exp_astar = astar(
        grid, start_node, end_node, weight_fn=weight_fn_normal, heuristic=heuristic
    )
    assert time_astar == pytest.approx(time_norm, rel=1e-3)
    assert len(p_astar) == len(p_norm)
