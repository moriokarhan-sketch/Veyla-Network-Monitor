import sys
import asyncio

# Set ProactorEventLoop on Windows to support subprocess calls like ping/ARP
if sys.platform.lower().startswith("win"):
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    except Exception:
        pass

import logging
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.config import settings
from app.database import engine, Base, SessionLocal, get_db
from app.models import User, Device, PingLog, AuditLog, SystemSetting
from app.schemas import (
    Token, UserResponse, UserCreate, UserUpdate, DeviceResponse, DeviceCreate, DeviceUpdate,
    PingLogResponse, AuditLogResponse, SystemSettingResponse, SystemSettingUpdate
)
from app.auth import (
    get_password_hash, verify_password, create_access_token, get_current_user,
    require_viewer, require_admin, require_super_admin
)
from app.monitoring import monitoring_daemon_loop, fetch_snmp_telemetry, poll_device
from app.discovery import run_discovery_scan

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("veyla_main")

# Initialize Database tables
Base.metadata.create_all(bind=engine)

# Seed Database
def seed_database():
    db = SessionLocal()
    try:
        # 1. Seed default settings if not exists
        default_settings = [
            ("line_notify_token", "", "LINE Notify Authorization Token for alerts"),
            ("smtp_server", "smtp.gmail.com", "SMTP Server address"),
            ("smtp_port", "587", "SMTP connection port"),
            ("smtp_username", "", "SMTP username/email"),
            ("smtp_password", "", "SMTP password/app password"),
            ("alert_email_from", "noreply@veyla.com", "Sender email address"),
            ("alert_email_to", "", "Recipient email address for critical alerts"),
        ]
        for key, val, desc in default_settings:
            exists = db.query(SystemSetting).filter(SystemSetting.key == key).first()
            if not exists:
                db.add(SystemSetting(key=key, value=val, description=desc))
        
        # 2. Seed default users if empty
        if db.query(User).count() == 0:
            super_admin = User(
                username="admin",
                password_hash=get_password_hash("admin123"),
                role="super_admin"
            )
            admin = User(
                username="veyla_admin",
                password_hash=get_password_hash("veyla123"),
                role="admin"
            )
            viewer = User(
                username="staff",
                password_hash=get_password_hash("staff123"),
                role="viewer"
            )
            db.add_all([super_admin, admin, viewer])
            logger.info("Default users seeded (admin, veyla_admin, staff).")
            
        # 3. Seed initial network topology devices if empty
        if db.query(Device).count() == 0:
            devices = [
                Device(ip_address="192.168.1.1", mac_address="00:11:22:33:44:55", name="Gateway Router", category="Router", location="Stage", status="online"),
                Device(ip_address="192.168.1.2", mac_address="00:11:22:33:aa:bb", name="Core Omada Switch", category="Switch", location="Office", status="online"),
                Device(ip_address="192.168.1.10", mac_address="aa:bb:cc:dd:ee:01", name="Cashier POS 1", category="POS", location="Cashier", status="online"),
                Device(ip_address="192.168.1.11", mac_address="aa:bb:cc:dd:ee:02", name="Bar POS 2", category="POS", location="Bar", status="online"),
                Device(ip_address="192.168.1.20", mac_address="22:33:44:55:66:77", name="Kitchen KDS Monitor", category="Monitor KDS", location="Kitchen", status="online"),
                Device(ip_address="192.168.1.50", mac_address="f0:25:72:a1:b2:c3", name="Bar CCTV IP Cam", category="CCTV", location="Bar", status="online"),
                Device(ip_address="192.168.1.51", mac_address="f0:25:72:a1:b2:c4", name="Stage CCTV IP Cam", category="CCTV", location="Stage", status="online"),
                Device(ip_address="192.168.1.100", mac_address="cc:cc:cc:11:22:33", name="HP LaserJet Receipts", category="Printer", location="Cashier", status="online"),
                Device(ip_address="192.168.1.201", mac_address="bc:5f:f4:90:12:34", name="Office Admin PC", category="PC", location="Office", status="online")
            ]
            db.add_all(devices)
            logger.info("Default devices seeded for Veyla topology.")
            
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding DB: {e}")
    finally:
        db.close()

seed_database()

app = FastAPI(title="Veyla Network Monitoring Web API")

# Enable CORS for frontend interface
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup daemon event
@app.on_event("startup")
async def startup_event():
    # Start the monitoring background loop in asyncio task
    asyncio.create_task(monitoring_daemon_loop(SessionLocal))

# Helper to log audits
def log_audit(db: Session, user: User, action: str, details: str):
    audit = AuditLog(
        user_id=user.id if user else None,
        action=action,
        details=details
    )
    db.add(audit)
    db.commit()

# --- AUTH ENDPOINTS ---

@app.post("/api/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/register", response_model=UserResponse)
def register(user_in: UserCreate, current_user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    # Check if exists
    exists = db.query(User).filter(User.username == user_in.username).first()
    if exists:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    new_user = User(
        username=user_in.username,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role,
        is_active=user_in.is_active
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    log_audit(db, current_user, "USER_REGISTERED", f"Created user '{new_user.username}' with role '{new_user.role}'")
    return new_user

@app.get("/api/auth/users", response_model=List[UserResponse])
def get_users(current_user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    return db.query(User).all()

@app.delete("/api/auth/users/{user_id}")
def delete_user(user_id: int, current_user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.username == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete default admin account")
    
    username = user.username
    db.delete(user)
    db.commit()
    log_audit(db, current_user, "USER_DELETED", f"Deleted user '{username}'")
    return {"status": "success", "message": f"User {username} deleted"}

@app.put("/api/auth/users/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_update: UserUpdate, current_user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.username == "admin" and user_update.username and user_update.username != "admin":
        raise HTTPException(status_code=400, detail="Cannot rename the default admin account")
    if user.username == "admin" and user_update.role and user_update.role != "super_admin":
        raise HTTPException(status_code=400, detail="Cannot demote the default admin account")
        
    if user_update.username:
        exists = db.query(User).filter(User.username == user_update.username, User.id != user_id).first()
        if exists:
            raise HTTPException(status_code=400, detail="Username already taken")
        user.username = user_update.username
        
    if user_update.role:
        user.role = user_update.role
    if user_update.is_active is not None:
        if user.username == "admin" and not user_update.is_active:
            raise HTTPException(status_code=400, detail="Cannot disable the default admin account")
        user.is_active = user_update.is_active
    if user_update.password:
        user.password_hash = get_password_hash(user_update.password)
        
    db.commit()
    db.refresh(user)
    log_audit(db, current_user, "USER_UPDATED", f"Updated user '{user.username}' details")
    return user

@app.post("/api/auth/impersonate/{user_id}", response_model=Token)
def impersonate_user(user_id: int, current_user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    if not target_user.is_active:
        raise HTTPException(status_code=400, detail="Cannot impersonate an inactive user")
    
    access_token = create_access_token(data={"sub": target_user.username, "role": target_user.role})
    log_audit(db, current_user, "ADMIN_IMPERSONATED_USER", f"Admin '{current_user.username}' simulated user '{target_user.username}'")
    return {"access_token": access_token, "token_type": "bearer"}

# --- DEVICE ENDPOINTS ---

@app.get("/api/devices", response_model=List[DeviceResponse])
def get_devices(current_user: User = Depends(require_viewer), db: Session = Depends(get_db)):
    return db.query(Device).all()

@app.post("/api/devices", response_model=DeviceResponse)
def add_device(device_in: DeviceCreate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    exists = db.query(Device).filter(Device.ip_address == device_in.ip_address).first()
    if exists:
        raise HTTPException(status_code=400, detail="IP Address already registered")
        
    device = Device(**device_in.dict())
    db.add(device)
    db.commit()
    db.refresh(device)
    
    log_audit(db, current_user, "DEVICE_ADDED", f"Added device '{device.name}' ({device.ip_address}) in category '{device.category}'")
    return device

@app.put("/api/devices/{device_id}", response_model=DeviceResponse)
def update_device(device_id: int, device_update: DeviceUpdate, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    for field, value in device_update.dict(exclude_unset=True).items():
        setattr(device, field, value)
        
    db.commit()
    db.refresh(device)
    log_audit(db, current_user, "DEVICE_UPDATED", f"Updated device '{device.name}' attributes")
    return device

@app.delete("/api/devices/{device_id}")
def delete_device(device_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    name = device.name
    ip = device.ip_address
    db.delete(device)
    db.commit()
    log_audit(db, current_user, "DEVICE_DELETED", f"Deleted device '{name}' ({ip})")
    return {"status": "success", "message": f"Device {name} removed"}

@app.post("/api/devices/{device_id}/mute")
def mute_device(device_id: int, minutes: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    if minutes <= 0:
        # Unmute
        device.is_muted = False
        device.mute_until = None
        log_audit(db, current_user, "DEVICE_UNMUTED", f"Unmuted alerts for device '{device.name}'")
    else:
        # Mute
        device.is_muted = True
        device.mute_until = datetime.utcnow() + timedelta(minutes=minutes)
        log_audit(db, current_user, "DEVICE_MUTED", f"Muted alerts for device '{device.name}' for {minutes} mins")
        
    db.commit()
    return {"status": "success", "is_muted": device.is_muted, "mute_until": device.mute_until}

@app.get("/api/devices/{device_id}/telemetry")
async def get_device_telemetry(device_id: int, current_user: User = Depends(require_viewer), db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    # Async poll SNMP data
    telemetry = await fetch_snmp_telemetry(device)
    return telemetry

# --- PING & AUDIT LOGS ENDPOINTS ---

@app.get("/api/logs/ping", response_model=List[PingLogResponse])
def get_ping_logs(device_id: Optional[int] = None, hours: int = 12, current_user: User = Depends(require_viewer), db: Session = Depends(get_db)):
    time_limit = datetime.utcnow() - timedelta(hours=hours)
    query = db.query(PingLog).filter(PingLog.timestamp >= time_limit)
    if device_id:
        query = query.filter(PingLog.device_id == device_id)
    return query.order_by(PingLog.timestamp.asc()).all()

@app.get("/api/logs/audit", response_model=List[AuditLogResponse])
def get_audit_logs(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    # Query logs and join User for usernames
    results = db.query(
        AuditLog.id,
        AuditLog.user_id,
        User.username.label("username"),
        AuditLog.action,
        AuditLog.details,
        AuditLog.timestamp
    ).outerjoin(User, AuditLog.user_id == User.id).order_by(AuditLog.timestamp.desc()).all()
    
    return results

# --- SETTINGS ENDPOINTS ---

@app.get("/api/settings", response_model=List[SystemSettingResponse])
def get_settings(current_user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    return db.query(SystemSetting).all()

@app.put("/api/settings/{key}", response_model=SystemSettingResponse)
def update_setting(key: str, setting_up: SystemSettingUpdate, current_user: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting key not found")
        
    old_val = setting.value
    setting.value = setting_up.value
    db.commit()
    db.refresh(setting)
    log_audit(db, current_user, "SETTING_CHANGED", f"Changed setting '{key}' from '{old_val}' to '{setting.value}'")
    return setting

# --- DISCOVERY ENDPOINTS ---

from pydantic import BaseModel

class BatchDeviceItem(BaseModel):
    ip_address: str
    mac_address: Optional[str] = None
    name: str
    category: str
    location: Optional[str] = None
    show_on_map: bool

@app.post("/api/discovery/scan")
async def trigger_subnet_scan(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """
    Runs a subnet scan synchronously and returns discovered online devices.
    """
    logger.info("Subnet scan triggered synchronously.")
    try:
        results = await run_discovery_scan("192.168.1")
        
        # Check against database
        existing_devices = db.query(Device).all()
        existing_ips = {d.ip_address: d for d in existing_devices}
        
        discovered_list = []
        for dev in results:
            ip = dev["ip_address"]
            if ip in existing_ips:
                existing_device = existing_ips[ip]
                discovered_list.append({
                    "ip_address": ip,
                    "mac_address": existing_device.mac_address or dev["mac_address"],
                    "name": existing_device.name,
                    "category": existing_device.category,
                    "location": existing_device.location or "Unknown",
                    "show_on_map": existing_device.show_on_map,
                    "already_exists": True
                })
            else:
                discovered_list.append({
                    "ip_address": ip,
                    "mac_address": dev["mac_address"],
                    "name": dev["name"],
                    "category": dev["category"],
                    "location": "Unknown",
                    "show_on_map": False, # Default new discovered devices to hide, user ticks to show
                    "already_exists": False
                })
                
        log_audit(db, current_user, "DISCOVERY_SCAN", f"Subnet scan completed. Found {len(discovered_list)} devices.")
        return discovered_list
    except Exception as e:
        logger.error(f"Discovery scan failed: {e}")
        raise HTTPException(status_code=500, detail=f"Discovery scan failed: {str(e)}")

@app.post("/api/devices/batch")
def add_batch_devices(devices_in: List[BatchDeviceItem], current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """
    Registers or updates a batch of devices from discovery scan selections.
    """
    for item in devices_in:
        device = db.query(Device).filter(Device.ip_address == item.ip_address).first()
        if device:
            device.name = item.name
            device.category = item.category
            device.location = item.location or "Unknown"
            device.show_on_map = item.show_on_map
            if item.mac_address and item.mac_address != "unknown":
                device.mac_address = item.mac_address
        else:
            new_device = Device(
                ip_address=item.ip_address,
                mac_address=item.mac_address,
                name=item.name,
                category=item.category,
                location=item.location or "Unknown",
                show_on_map=item.show_on_map,
                status="online"
            )
            db.add(new_device)
            
    db.commit()
    log_audit(db, current_user, "BATCH_DEVICES_SAVED", f"Processed and saved batch of {len(devices_in)} devices.")
    return {"status": "success", "message": f"Processed {len(devices_in)} devices successfully."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
