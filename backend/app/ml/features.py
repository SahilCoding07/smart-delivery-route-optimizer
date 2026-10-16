"""
Feature Engineering and Preprocessing Pipeline for ETA Prediction.

What it does:
    Defines the feature schema and scikit-learn ColumnTransformer pipeline
    to preprocess raw trip and road edge data into numerical feature matrices:
    - Categorical variables ('road_type', 'weather') encoded via One-Hot Encoding.
    - Continuous numerical variables ('distance_km', 'num_turns', 'hour_of_day', 'day_of_week')
      scaled via StandardScaler.
    - Binary indicator flags ('is_weekend', 'is_peak_hour') passed through.

Provides utility functions to convert raw edge properties and departure timestamps
into model-ready feature rows.
"""

from __future__ import annotations
from datetime import datetime
from typing import Any
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from app.ml.data_gen import is_peak_hour_fn

FEATURE_COLUMNS = [
    "distance_km",
    "hour_of_day",
    "day_of_week",
    "is_weekend",
    "is_peak_hour",
    "road_type",
    "num_turns",
    "weather",
]

TARGET_COLUMN = "travel_time_minutes"


def build_preprocessor() -> ColumnTransformer:
    """
    Construct a scikit-learn ColumnTransformer for ETA feature transformation.
    """
    numeric_features = ["distance_km", "num_turns", "hour_of_day", "day_of_week"]
    categorical_features = ["road_type", "weather"]
    binary_features = ["is_weekend", "is_peak_hour"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric_features),
            (
                "cat",
                OneHotEncoder(categories=[
                    ["residential", "primary", "highway"],
                    ["clear", "rain"],
                ], handle_unknown="ignore"),
                categorical_features,
            ),
            ("bin", "passthrough", binary_features),
        ],
        remainder="drop",
    )
    return preprocessor


def parse_departure_time(departure_time: datetime | str | None) -> tuple[int, int, int, int]:
    """
    Extract (hour_of_day, day_of_week, is_weekend, is_peak_hour) from datetime or ISO string.
    Defaults to 14:00 on a Tuesday (typical non-peak weekday) if None.
    """
    if departure_time is None:
        hour = 14
        day = 1  # Tuesday
    elif isinstance(departure_time, datetime):
        hour = departure_time.hour
        day = departure_time.weekday()
    elif isinstance(departure_time, str):
        try:
            # Handle ISO string with or without Z/offset
            clean_str = departure_time.replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_str)
            hour = dt.hour
            day = dt.weekday()
        except Exception:
            hour = 14
            day = 1
    else:
        hour = 14
        day = 1

    is_weekend = 1 if day >= 5 else 0
    is_peak = is_peak_hour_fn(hour, bool(is_weekend))
    return hour, day, is_weekend, is_peak


def create_feature_row(
    distance_km: float,
    road_type: str = "residential",
    num_turns: int = 1,
    departure_time: datetime | str | None = None,
    weather: str = "clear",
) -> pd.DataFrame:
    """
    Convert a single road edge and temporal conditions into a 1-row DataFrame
    matching the training schema.
    """
    hour, day, is_weekend, is_peak = parse_departure_time(departure_time)

    # Sanitize inputs
    road_type_clean = road_type if road_type in ["residential", "primary", "highway"] else "residential"
    weather_clean = weather if weather in ["clear", "rain"] else "clear"

    data = {
        "distance_km": [max(0.01, float(distance_km))],
        "hour_of_day": [int(hour)],
        "day_of_week": [int(day)],
        "is_weekend": [int(is_weekend)],
        "is_peak_hour": [int(is_peak)],
        "road_type": [road_type_clean],
        "num_turns": [max(0, int(num_turns))],
        "weather": [weather_clean],
    }
    return pd.DataFrame(data)
