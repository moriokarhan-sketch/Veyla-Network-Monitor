from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# --- User Schemas ---
class UserBase(BaseModel):
    username: str
    role: str  # super_admin, admin, viewer
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

# --- Device Schemas ---
class DeviceBase(BaseModel):
    ip_address: str
    name: str
    category: str  # Router, Switch, POS, CCTV, Printer, PC, Monitor KDS
    location: Optional[str] = None
    snmp_community: Optional[str] = "public"
    is_monitored: Optional[bool] = True
    show_on_map: Optional[bool] = True

class DeviceCreate(DeviceBase):
    mac_address: Optional[str] = None

class DeviceUpdate(BaseModel):
    ip_address: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    snmp_community: Optional[str] = None
    is_monitored: Optional[bool] = None
    is_muted: Optional[bool] = None
    mute_until: Optional[datetime] = None
    show_on_map: Optional[bool] = None

class DeviceResponse(DeviceBase):
    id: int
    mac_address: Optional[str] = None
    is_muted: bool
    mute_until: Optional[datetime] = None
    status: str
    last_latency: Optional[float] = None
    last_seen: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Ping Log Schemas ---
class PingLogResponse(BaseModel):
    id: int
    device_id: int
    latency_ms: Optional[float] = None
    status: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Audit Log Schemas ---
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None  # Helper field populated via query
    action: str
    details: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

# --- System Setting Schemas ---
class SystemSettingBase(BaseModel):
    key: str
    value: str
    description: Optional[str] = None

class SystemSettingUpdate(BaseModel):
    value: str

class SystemSettingResponse(SystemSettingBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
