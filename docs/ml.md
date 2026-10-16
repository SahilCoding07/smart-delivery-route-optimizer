# 🧠 RouteWise Machine Learning Engine & ETA Prediction

RouteWise incorporates a supervised Machine Learning pipeline that predicts road travel durations. Rather than treating ML as an isolated post-processing step, RouteWise integrates ML directly into its graph theory core: **the predicted travel times serve as dynamic edge weights during shortest path and TSP tour construction**.

---

## 1. Simulated Traffic & Trip Dataset

Real-world commercial GPS telematics and speed sensor APIs are prohibitively expensive for small businesses and student projects. RouteWise generates a physics-grounded, reproducible synthetic dataset of **50,000 trip legs** based on urban traffic dynamics.

### 📐 Physical Formulation

For each road segment or trip leg:
$$\text{Effective Speed } (v_{\text{eff}}) = v_{\text{nominal}}(\text{road\_type}) \times \gamma_{\text{peak}} \times \gamma_{\text{weather}} \times \gamma_{\text{weekend}}$$

Where:
- **Nominal Speeds ($v_{\text{nominal}}$)**:
  - **Residential roads**: $28.0\text{ km/h}$
  - **Primary arterials**: $48.0\text{ km/h}$
  - **Urban highways**: $75.0\text{ km/h}$
- **Peak Hour Congestion Factor ($\gamma_{\text{peak}}$)**:
  - Weekdays between 8:00–10:00 AM and 5:00–8:00 PM: $\gamma_{\text{peak}} \sim \mathcal{U}(0.60, 0.70)$ (30% to 40% speed reduction).
  - Off-peak hours: $\gamma_{\text{peak}} = 1.0$.
- **Weather Factor ($\gamma_{\text{weather}}$)**:
  - Rain: $\gamma_{\text{weather}} \sim \mathcal{U}(0.75, 0.82)$ (18% to 25% speed reduction from cautious driving and reduced braking traction).
  - Clear: $\gamma_{\text{weather}} = 1.0$.
- **Weekend Factor ($\gamma_{\text{weekend}}$)**:
  - Off-peak weekends: $\gamma_{\text{weekend}} \sim \mathcal{U}(1.05, 1.12)$ (5% to 12% faster cruising).

### ⏱️ Total Travel Time
$$\text{Travel Time (minutes)} = \left(\frac{\text{Distance (km)}}{v_{\text{eff}}(\text{km/h})} \times 60\right) + \sum_{k=1}^{N_{\text{turns}}} \tau_{\text{turn}} + \epsilon$$

Where:
- $\tau_{\text{turn}} \sim \mathcal{U}(0.20, 0.35)\text{ min}$ (12 to 21 seconds of deceleration, queueing, and acceleration per turn/intersection).
- $\epsilon \sim \mathcal{N}(0, \sigma^2)$ with $\sigma = 0.40 + 0.05 \times \text{Distance}$ (Gaussian noise capturing signal waits, jaywalking, and transient stops).
- Lower-bounded by $0.2\text{ minutes}$ to respect physical causality.

---

## 2. Feature Schema

| Feature | Type | Range / Categories | Description |
| :--- | :--- | :--- | :--- |
| `distance_km` | Float | $0.10$ to $25.00$ km | Physical road leg length |
| `hour_of_day` | Integer | $6$ to $23$ | Departure hour in 24-hour clock |
| `day_of_week` | Integer | $0$ to $6$ | 0=Monday, 6=Sunday |
| `is_weekend` | Binary | $0$ or $1$ | Indicator if Saturday or Sunday |
| `is_peak_hour`| Binary | $0$ or $1$ | Indicator if weekday rush hour |
| `road_type` | Categorical | `residential`, `primary`, `highway` | Road hierarchy class |
| `num_turns` | Integer | $0$ to $15$ | Count of intersection turns |
| `weather` | Categorical | `clear`, `rain` | Meteorological condition |
| **`travel_time_minutes`** | Float | **Target Variable** | Duration to traverse segment |

---

## 3. Candidate Models & Benchmarking

We benchmark three model paradigms on an unseen 20% holdout test split (10,000 samples):

1. **Naive Baseline**:
   - Assumes constant velocity: $\hat{y} = \frac{\text{distance}}{35\text{ km/h}} \times 60$.
   - Ignores road hierarchy, weather, and peak-hour congestion.
2. **Linear Regression (Elastic / OLS)**:
   - One-hot encoded road types and weather; scaled continuous features.
   - Captures average effects, but struggles with multiplicative interactions between rain, peak hours, and road types.
3. **Random Forest Regressor (Champion)**:
   - 80 decision trees, max depth of 12.
   - Captures non-linear thresholds and feature cross-products (e.g. rain + peak hour on residential roads).

---

## 4. Graph Edge-Weight Integration

The true innovation of RouteWise is how ML predictions alter graph pathfinding:

```python
# Create an ML-weighted graph edge evaluator
ml_weight_fn = make_ml_weight_fn(
    model=trained_model,
    departure_time="2026-10-15T18:30:00",  # Evening rush hour
    weather="rain"                         # Adverse weather
)

# Pass directly to Dijkstra, A*, or TSP
path, travel_time, nodes_explored = astar(graph, source, target, weight_fn=ml_weight_fn)
```

### Why this matters:
- A highway route might be physically longer by 2 km, but during rush hour, local residential shortcuts might become gridlocked with 4x travel times.
- With distance-only routing, a GPS would pick the congested residential road.
- With RouteWise's ML edge weights, the algorithm selects the highway because the **predicted travel time** is shorter, delivering orders faster.
