"""
ML Travel Time Predictor and Dynamic Graph Edge-Weight Integration.

What it does:
    Provides sub-millisecond travel time predictions for road network edges.
    Connects trained scikit-learn models directly into the graph engine via
    a dynamic `weight_fn(u, v, edge_data)` callback.

Key Feature - ML Edge Weights:
    Instead of running Dijkstra, A*, or TSP on static physical distances (km),
    this module converts edges into predicted travel times (minutes) based on:
    - Real-time departure hour & day of week (congestion peak vs. off-peak)
    - Dynamic weather conditions ('clear' vs. 'rain')
    - Road hierarchy classification ('residential' vs. 'primary' vs. 'highway')
    - Intersection turn counts

Fallback Safety:
    If the trained model file is missing or corrupted, the system logs a clear warning
    and gracefully falls back to a deterministic physics-based baseline speed formula.
"""

from __future__ import annotations
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Optional
import joblib
import pandas as pd

from app.config import settings
from app.ml.features import create_feature_row

logger = logging.getLogger("routewise.ml.predict")

# Global cached model reference
_CACHED_MODEL: Any | None = None
_MODEL_LOAD_ATTEMPTED: bool = False


def load_eta_model(model_path: Optional[Path | str] = None) -> Any | None:
    """
    Load the trained serialized scikit-learn model from disk.
    Caches in memory for rapid repeated inference.
    Returns None if the file is not found.
    """
    global _CACHED_MODEL, _MODEL_LOAD_ATTEMPTED

    if _CACHED_MODEL is not None:
        return _CACHED_MODEL

    path = Path(model_path) if model_path else settings.MODELS_DIR / "eta_model.joblib"

    if not path.exists():
        if not _MODEL_LOAD_ATTEMPTED:
            logger.warning(
                f"[Model Not Found] '{path}' does not exist. "
                "Routing algorithms will fall back to physics-based travel time calculations."
            )
            _MODEL_LOAD_ATTEMPTED = True
        return None

    try:
        model = joblib.load(path)
        _CACHED_MODEL = model
        _MODEL_LOAD_ATTEMPTED = True
        logger.info(f"Loaded trained ETA model successfully from {path}")
        return model
    except Exception as e:
        logger.error(f"Failed to load ETA model from {path}: {e}")
        return None


def fallback_travel_time_minutes(
    distance_km: float,
    road_type: str = "residential",
    num_turns: int = 1,
    is_peak: bool = False,
    is_rain: bool = False,
) -> float:
    """
    Deterministic physics-based fallback if ML model is unavailable.
    """
    speed_map = {
        "residential": 28.0,
        "primary": 48.0,
        "highway": 75.0,
    }
    speed = speed_map.get(road_type, 30.0)
    if is_peak:
        speed *= 0.65
    if is_rain:
        speed *= 0.80

    cruising_min = (distance_km / max(10.0, speed)) * 60.0
    turn_min = num_turns * 0.25
    return max(0.1, cruising_min + turn_min)


def predict_edge_time(
    model: Any | None,
    distance_km: float,
    road_type: str = "residential",
    num_turns: int = 1,
    departure_time: datetime | str | None = None,
    weather: str = "clear",
) -> float:
    """
    Predict travel time in minutes for a single road edge.
    """
    if model is None:
        # Check if hour is peak
        from app.ml.features import parse_departure_time
        hour, day, is_weekend, is_peak = parse_departure_time(departure_time)
        return fallback_travel_time_minutes(
            distance_km=distance_km,
            road_type=road_type,
            num_turns=num_turns,
            is_peak=bool(is_peak),
            is_rain=(weather == "rain"),
        )

    row_df = create_feature_row(
        distance_km=distance_km,
        road_type=road_type,
        num_turns=num_turns,
        departure_time=departure_time,
        weather=weather,
    )

    pred = model.predict(row_df)[0]
    return max(0.05, float(pred))


def make_ml_weight_fn(
    model: Any | None = None,
    departure_time: datetime | str | None = None,
    weather: str = "clear",
) -> Callable[[Any, Any, dict[str, Any]], float]:
    """
    Factory function returning a weight_fn(u, v, edge_data) -> minutes
    suitable for passing directly into Dijkstra, A*, and TSP solvers.

    Includes an internal memoization cache for identical (distance, road_type, num_turns)
    tuples to achieve microsecond evaluation speeds across large graph searches.
    """
    active_model = model if model is not None else load_eta_model()
    cache: dict[tuple[float, str, int], float] = {}

    def weight_fn(u: Any, v: Any, edge_data: dict[str, Any]) -> float:
        dist_km = float(edge_data.get("length_km", 0.5))
        road_type = str(edge_data.get("road_type", "residential"))
        num_turns = int(edge_data.get("num_turns", 1))

        cache_key = (round(dist_km, 4), road_type, num_turns)
        if cache_key in cache:
            return cache[cache_key]

        time_min = predict_edge_time(
            model=active_model,
            distance_km=dist_km,
            road_type=road_type,
            num_turns=num_turns,
            departure_time=departure_time,
            weather=weather,
        )

        cache[cache_key] = time_min
        return time_min

    return weight_fn
