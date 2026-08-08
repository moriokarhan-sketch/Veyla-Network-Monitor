from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="viewer", nullable=False)  # super_admin, admin, viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    audit_logs = relationship("AuditLog", back_populates="user")


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String, unique=True, index=True, nullable=False)
    mac_address = Column(String, nullable=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)  # Router, Switch, POS, CCTV, Printer, PC, Monitor KDS
    location = Column(String, nullable=True)  # Cashier, Bar, Stage, etc.
    snmp_community = Column(String, default="public", nullable=True)
    is_monitored = Column(Boolean, default=True)
    show_on_map = Column(Boolean, default=True, nullable=False)
    
    # Maintenance / Mute settings
    is_muted = Column(Boolean, default=False)
    mute_until = Column(DateTime, nullable=True)
    
    # Status and telemetry
    status = Column(String, default="offline", nullable=False)  # online, warning, offline
    last_latency = Column(Float, nullable=True)
    last_seen = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    ping_logs = relationship("PingLog", back_populates="device", cascade="all, delete-orphan")


class PingLog(Base):
    __tablename__ = "ping_logs"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    latency_ms = Column(Float, nullable=True)
    status = Column(String, nullable=False)  # online, offline
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    device = relationship("Device", back_populates="ping_logs")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String, nullable=False)  # e.g., "ADD_DEVICE", "MUTE_ALERTS", "CHANGE_SETTING"
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="audit_logs")


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(String, nullable=False)
    description = Column(String, nullable=True)
