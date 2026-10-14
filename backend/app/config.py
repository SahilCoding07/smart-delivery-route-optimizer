"""Application Configuration."""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application settings loaded from environment or .env file."""
    
    # Project paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    MODELS_DIR: Path = BASE_DIR / "models"
    
    # City & Graph Configuration
    CITY: str = "Central Delhi, New Delhi, India"
    USE_SYNTHETIC_GRID: bool = True
    GRID_ROWS: int = 30
    GRID_COLS: int = 30
    
    # Speed defaults (km/h) for routing & heuristics
    DEFAULT_SPEED_KMH: float = 30.0
    MAX_SPEED_KMH: float = 80.0
    
    # API settings
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
