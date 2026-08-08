import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "veyla_pub_secret_key_change_me_in_production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./veyla_monitor.db")

    # Network Configuration
    SUBNET_TO_SCAN: str = os.getenv("SUBNET_TO_SCAN", "192.168.1.0/24")
    GATEWAY_IP: str = os.getenv("GATEWAY_IP", "192.168.1.1")
    
    # Default alert limits
    WARNING_LATENCY_MS: float = 100.0  # Latency > 100ms triggers Warning
    
    # Alerting Credentials placeholders
    # In a real environment, these would be loaded from .env or database
    LINE_NOTIFY_TOKEN: str = os.getenv("LINE_NOTIFY_TOKEN", "")
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    ALERT_EMAIL_FROM: str = os.getenv("ALERT_EMAIL_FROM", "")
    ALERT_EMAIL_TO: str = os.getenv("ALERT_EMAIL_TO", "")

    class Config:
        env_file = ".env"

settings = Settings()
