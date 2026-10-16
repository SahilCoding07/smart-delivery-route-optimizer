"""
Model Training, Cross-Validation, and Comparison Pipeline.

What it does:
    1. Generates or loads the 50,000-sample synthetic trip dataset.
    2. Performs an 80/20 train/test split with fixed random seed.
    3. Trains and benchmarks three distinct models:
        a. Naive Baseline (constant physical speed distance / 35 km/h * 60)
        b. Linear Regression (standard parametric linear relationship)
        c. Random Forest Regressor (non-linear ensemble capturing congestion interactions)
    4. Evaluates MAE, RMSE, and R² score on unseen test data.
    5. Saves the champion model as 'eta_model.joblib' and metrics table to 'metrics.json'.
    6. Generates and saves evaluation plots to docs/ (feature importance & pred-vs-actual).
"""

from __future__ import annotations
import json
from pathlib import Path
from typing import Any
import joblib
import matplotlib
matplotlib.use("Agg")  # Non-interactive headless backend for plotting
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, RegressorMixin
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from app.config import settings
from app.ml.data_gen import generate_trip_dataset
from app.ml.features import FEATURE_COLUMNS, TARGET_COLUMN, build_preprocessor


class NaiveBaselineModel(BaseEstimator, RegressorMixin):
    """
    Naive baseline estimator: predicts travel time assuming a constant
    average speed of 35 km/h without any temporal or congestion features.
    """

    def __init__(self, average_speed_kmh: float = 35.0) -> None:
        self.average_speed_kmh = average_speed_kmh

    def fit(self, X: pd.DataFrame, y: Any = None) -> "NaiveBaselineModel":
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        distances = X["distance_km"].to_numpy()
        return (distances / self.average_speed_kmh) * 60.0


def train_and_evaluate(
    df: pd.DataFrame | None = None,
    save_artifacts: bool = True,
    seed: int = 42,
) -> tuple[dict[str, dict[str, float]], Any]:
    """
    Train all 3 candidate models, evaluate metrics, and save artifacts.
    """
    if df is None:
        print("Generating 50,000 synthetic trip records...")
        df = generate_trip_dataset(num_records=50000, seed=seed)

    X = df[FEATURE_COLUMNS]
    y = df[TARGET_COLUMN].to_numpy()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=seed
    )

    models: dict[str, Any] = {
        "Naive Baseline": NaiveBaselineModel(average_speed_kmh=35.0),
        "Linear Regression": Pipeline([
            ("preprocessor", build_preprocessor()),
            ("regressor", LinearRegression()),
        ]),
        "Random Forest": Pipeline([
            ("preprocessor", build_preprocessor()),
            (
                "regressor",
                RandomForestRegressor(
                    n_estimators=80,
                    max_depth=12,
                    random_state=seed,
                    n_jobs=-1,
                ),
            ),
        ]),
    }

    metrics: dict[str, dict[str, float]] = {}
    predictions: dict[str, np.ndarray] = {}

    print(f"\nTraining and evaluating on {len(X_train):,} train / {len(X_test):,} test trips...")

    for name, model in models.items():
        print(f"  Training {name}...")
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        predictions[name] = y_pred

        mae = float(mean_absolute_error(y_test, y_pred))
        rmse = float(root_mean_squared_error(y_test, y_pred))
        r2 = float(r2_score(y_test, y_pred))

        metrics[name] = {
            "MAE_minutes": round(mae, 3),
            "RMSE_minutes": round(rmse, 3),
            "R2_score": round(r2, 4),
        }

    # Identify champion model (highest R2 / lowest MAE)
    champion_name = "Random Forest"
    champion_model = models[champion_name]

    if save_artifacts:
        # 1. Save champion model
        models_dir = settings.MODELS_DIR
        models_dir.mkdir(parents=True, exist_ok=True)
        model_path = models_dir / "eta_model.joblib"
        joblib.dump(champion_model, model_path)
        print(f"\n[Saved] Champion model saved to: {model_path}")

        # 2. Save metrics table JSON
        metrics_path = models_dir / "metrics.json"
        with open(metrics_path, "w") as f:
            json.dump({
                "models": metrics,
                "champion": champion_name,
                "sample_count": len(df),
                "test_size": len(X_test),
            }, f, indent=2)
        print(f"[Saved] Metrics summary saved to: {metrics_path}")

        # 3. Generate documentation plots
        docs_dir = settings.BASE_DIR.parent / "docs"
        docs_dir.mkdir(parents=True, exist_ok=True)

        _generate_plots(
            champion_model=champion_model,
            y_test=y_test,
            y_pred=predictions[champion_name],
            docs_dir=docs_dir,
        )

    return metrics, champion_model


def _generate_plots(champion_model: Any, y_test: np.ndarray, y_pred: np.ndarray, docs_dir: Path) -> None:
    """Generate Feature Importance and Predicted vs Actual evaluation plots."""
    # Plot 1: Predicted vs Actual Scatter Plot
    fig, ax = plt.subplots(figsize=(8, 6))
    sample_indices = np.random.choice(len(y_test), size=min(1000, len(y_test)), replace=False)
    ax.scatter(y_test[sample_indices], y_pred[sample_indices], alpha=0.4, color="#0284c7", edgecolors="none", s=25)
    max_val = max(float(np.max(y_test[sample_indices])), float(np.max(y_pred[sample_indices])))
    ax.plot([0, max_val], [0, max_val], "r--", lw=2, label="Ideal Fit (y = x)")
    ax.set_xlabel("Actual Travel Time (Minutes)", fontsize=12)
    ax.set_ylabel("Predicted Travel Time (Minutes)", fontsize=12)
    ax.set_title("RouteWise ETA Model: Predicted vs. Actual Travel Times", fontsize=14, fontweight="bold")
    ax.legend(frameon=True)
    ax.grid(True, linestyle=":", alpha=0.6)
    plt.tight_layout()
    pred_path = docs_dir / "pred_vs_actual.png"
    plt.savefig(pred_path, dpi=150)
    plt.close(fig)
    print(f"[Saved] Scatter plot saved to: {pred_path}")

    # Plot 2: Feature Importance Bar Chart (from Random Forest regressor)
    try:
        rf_regressor = champion_model.named_steps["regressor"]
        preprocessor = champion_model.named_steps["preprocessor"]
        feature_names = preprocessor.get_feature_names_out()
        importances = rf_regressor.feature_importances_

        # Clean feature names for presentation
        clean_names = [
            f.replace("num__", "").replace("cat__", "").replace("bin__", "")
            for f in feature_names
        ]

        sorted_idx = np.argsort(importances)
        fig, ax = plt.subplots(figsize=(10, 6))
        ax.barh(np.array(clean_names)[sorted_idx], importances[sorted_idx], color="#059669")
        ax.set_xlabel("Relative Gini Feature Importance", fontsize=12)
        ax.set_title("RouteWise ETA Predictor: Feature Importances", fontsize=14, fontweight="bold")
        ax.grid(axis="x", linestyle=":", alpha=0.6)
        plt.tight_layout()
        imp_path = docs_dir / "feature_importance.png"
        plt.savefig(imp_path, dpi=150)
        plt.close(fig)
        print(f"[Saved] Feature importance plot saved to: {imp_path}")
    except Exception as e:
        print(f"Warning: could not generate feature importance plot: {e}")


def print_comparison_table(metrics: dict[str, dict[str, float]]) -> None:
    """Format and print model comparison table."""
    print("\n" + "=" * 65)
    print("RouteWise ETA Model Benchmark & Comparison Table")
    print("=" * 65)
    print(f"{'Model':<22} | {'MAE (min)':<11} | {'RMSE (min)':<11} | {'R² Score':<10}")
    print("-" * 65)
    for model_name, m in metrics.items():
        print(f"{model_name:<22} | {m['MAE_minutes']:<11.3f} | {m['RMSE_minutes']:<11.3f} | {m['R2_score']:<10.4f}")
    print("=" * 65)


if __name__ == "__main__":
    metrics, _ = train_and_evaluate(save_artifacts=True)
    print_comparison_table(metrics)
