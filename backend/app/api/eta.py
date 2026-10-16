"""Single-Leg Travel Time Prediction Endpoint."""

from fastapi import APIRouter
from app.ml.predict import predict_edge_time, load_eta_model
from app.schemas import ETAPredictRequest, ETAPredictResponse

router = APIRouter(prefix="/eta", tags=["ETA Prediction"])


@router.post("/predict", response_model=ETAPredictResponse, summary="Predict Travel Time for a Single Road Leg")
def predict_single_leg(request: ETAPredictRequest) -> ETAPredictResponse:
    """
    Predict travel time in minutes for a given road distance, road type,
    turn count, departure time, and weather condition.
    """
    model = load_eta_model()
    pred_minutes = predict_edge_time(
        model=model,
        distance_km=request.distance_km,
        road_type=request.road_type,
        num_turns=request.num_turns,
        departure_time=request.departure_time,
        weather=request.weather,
    )

    effective_speed = (request.distance_km / max(0.01, pred_minutes)) * 60.0

    return ETAPredictResponse(
        predicted_travel_time_minutes=round(pred_minutes, 2),
        effective_speed_kmh=round(effective_speed, 1),
        model_used="Random Forest Regressor (Trained)" if model is not None else "Physics Heuristic Baseline",
    )
