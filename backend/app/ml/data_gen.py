"""
Realistic Synthetic Delivery Trip Data Generator.

What it does:
    Generates a realistic synthetic dataset of delivery trips and leg traversals
    grounded in real-world urban physics:
    - Speed varies by road hierarchy (residential vs. primary arterial vs. highway).
    - Peak-hour congestion (8-10 AM, 5-8 PM on weekdays) significantly reduces speeds.
    - Weather conditions (rain) induce caution, braking distance, and traffic slowdowns.
    - Turn penalties reflect deceleration and waiting at intersections.
    - Gaussian noise simulates stochastic events like red lights and pedestrian crossings.

Reproducibility:
    Uses a fixed random seed (default: 42) to produce identical datasets across runs.
"""

from __future__ import annotations
import math
from pathlib import Path
import numpy as np
import pandas as pd


def is_peak_hour_fn(hour: int, is_weekend: bool) -> int:
    """Returns 1 if weekday morning (8-10 AM) or evening (5-8 PM) peak rush hours."""
    if is_weekend:
        return 0
    if (8 <= hour <= 10) or (17 <= hour <= 20):
        return 1
    return 0


def generate_trip_dataset(num_records: int = 50000, seed: int = 42) -> pd.DataFrame:
    """
    Generate synthetic trip records for ETA regression modeling.

    Parameters:
        num_records: Total number of trip samples to generate (default: 50,000).
        seed: Random seed for deterministic reproducibility.

    Returns:
        pd.DataFrame containing feature columns and 'travel_time_minutes' target.
    """
    rng = np.random.default_rng(seed)

    # 1. Distances: log-normal distribution to capture typical short delivery legs (0.2km to 15km)
    # Median ~ 2.5 km
    distances = rng.lognormal(mean=0.9, sigma=0.7, size=num_records)
    distances = np.clip(distances, 0.1, 25.0)

    # 2. Temporal attributes
    hours = rng.integers(low=6, high=23, size=num_records)  # delivery hours 6 AM - 11 PM
    days = rng.integers(low=0, high=7, size=num_records)   # 0=Monday, 6=Sunday
    is_weekend = (days >= 5).astype(int)

    is_peak = np.array([
        is_peak_hour_fn(int(h), bool(w))
        for h, w in zip(hours, is_weekend)
    ], dtype=int)

    # 3. Road classifications
    # 60% residential streets, 30% primary arterials, 10% urban highways
    road_types = rng.choice(
        ["residential", "primary", "highway"],
        size=num_records,
        p=[0.60, 0.30, 0.10],
    )

    # Base nominal speeds (km/h) by road type
    base_speed_map = {
        "residential": 28.0,
        "primary": 48.0,
        "highway": 75.0,
    }
    nominal_speeds = np.array([base_speed_map[rt] for rt in road_types])

    # 4. Turn counts (proportional to distance and road type)
    # Residential roads have many turns, highways have very few
    turn_rates = np.array([
        1.5 if rt == "residential" else (0.8 if rt == "primary" else 0.2)
        for rt in road_types
    ])
    expected_turns = np.maximum(0, distances * turn_rates)
    num_turns = rng.poisson(lam=expected_turns)
    num_turns = np.clip(num_turns, 0, 15)

    # 5. Weather conditions
    # 80% clear, 20% rainy
    weather = rng.choice(["clear", "rain"], size=num_records, p=[0.80, 0.20])

    # 6. Physical Speed Adjustments
    # Speed multiplier factors
    speed_factor = np.ones(num_records)

    # Congestion penalty: 30% to 42% speed reduction in peak hours
    peak_slowdown = rng.uniform(0.60, 0.70, size=num_records)
    speed_factor = np.where(is_peak == 1, speed_factor * peak_slowdown, speed_factor)

    # Weather penalty: 18% to 25% speed reduction in rain
    rain_slowdown = rng.uniform(0.75, 0.82, size=num_records)
    speed_factor = np.where(weather == "rain", speed_factor * rain_slowdown, speed_factor)

    # Weekend light-traffic boost (when not peak)
    weekend_boost = rng.uniform(1.05, 1.12, size=num_records)
    speed_factor = np.where((is_weekend == 1) & (is_peak == 0), speed_factor * weekend_boost, speed_factor)

    # Effective speed (km/h)
    effective_speed = nominal_speeds * speed_factor

    # 7. Travel time calculation (minutes)
    # Base cruising time in minutes = (distance_km / speed_kmh) * 60.0
    cruising_time_min = (distances / effective_speed) * 60.0

    # Turn penalty: each turn adds deceleration/queueing delay (0.20 to 0.35 minutes)
    turn_penalty_min = num_turns * rng.uniform(0.20, 0.35, size=num_records)

    # Gaussian stochastic noise (traffic lights, pedestrians, stopping variability)
    # Noise standard deviation scales modestly with distance
    noise_sigma = 0.4 + 0.05 * distances
    noise = rng.normal(loc=0.0, scale=noise_sigma, size=num_records)

    travel_time_minutes = cruising_time_min + turn_penalty_min + noise

    # Physical constraint: travel time must be at least 0.2 minutes (12 seconds)
    travel_time_minutes = np.maximum(0.2, travel_time_minutes)

    df = pd.DataFrame({
        "distance_km": np.round(distances, 3),
        "hour_of_day": hours,
        "day_of_week": days,
        "is_weekend": is_weekend,
        "is_peak_hour": is_peak,
        "road_type": road_types,
        "num_turns": num_turns,
        "weather": weather,
        "travel_time_minutes": np.round(travel_time_minutes, 3),
    })

    return df


def save_dataset(df: pd.DataFrame, filepath: Path | str) -> Path:
    """Save the dataset to a CSV file."""
    path = Path(filepath)
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    return path


if __name__ == "__main__":
    from app.config import settings
    dataset_path = settings.DATA_DIR / "synthetic_trips.csv"
    print(f"Generating 50,000 synthetic trip records...")
    df = generate_trip_dataset(num_records=50000, seed=42)
    save_dataset(df, dataset_path)
    print(f"Saved dataset to {dataset_path} ({len(df):,} rows)")
    print("\nSample records:")
    print(df.head())
