import logging
import smtplib
from email.mime.text import MIMEText
from datetime import datetime
import requests
from sqlalchemy.orm import Session
from app.config import settings
from app.models import SystemSetting, Device

logger = logging.getLogger("veyla_alerts")
logger.setLevel(logging.INFO)

def get_setting(db: Session, key: str, default: str = "") -> str:
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    return setting.value if setting else default

def send_line_notification(token: str, message: str) -> bool:
    if not token:
        logger.warning("LINE Notify Token is empty. Skipping notification.")
        return False
    
    url = "https://notify-api.line.me/api/notify"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"message": message}
    
    try:
        response = requests.post(url, headers=headers, data=payload, timeout=10)
        if response.status_code == 200:
            logger.info("LINE Notify sent successfully.")
            return True
        else:
            logger.error(f"LINE Notify failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        logger.error(f"Error sending LINE Notify: {e}")
        return False

def send_email_notification(db: Session, subject: str, message_body: str) -> bool:
    smtp_server = get_setting(db, "smtp_server", settings.SMTP_SERVER)
    smtp_port = int(get_setting(db, "smtp_port", str(settings.SMTP_PORT)))
    smtp_user = get_setting(db, "smtp_username", settings.SMTP_USERNAME)
    smtp_pass = get_setting(db, "smtp_password", settings.SMTP_PASSWORD)
    from_email = get_setting(db, "alert_email_from", settings.ALERT_EMAIL_FROM)
    to_email = get_setting(db, "alert_email_to", settings.ALERT_EMAIL_TO)
    
    if not smtp_server or not smtp_user or not smtp_pass or not to_email:
        logger.warning("Email configurations are incomplete. Skipping email alert.")
        return False
        
    msg = MIMEText(message_body)
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email
    
    try:
        # Connect to SMTP server
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(from_email, [to_email], msg.as_string())
        server.quit()
        logger.info("Email alert sent successfully.")
        return True
    except Exception as e:
        logger.error(f"Error sending Email alert: {e}")
        return False

def trigger_alert(db: Session, device: Device, alert_type: str, details: str):
    """
    Checks if device alerts are muted. If not, dispatches alerts to LINE and/or Email.
    alert_type: "CRITICAL" (Offline router/POS/KDS) or "WARNING" (Offline printer/CCTV or high latency)
    """
    # 1. Check if device is muted
    now = datetime.utcnow()
    if device.is_muted:
        if device.mute_until and device.mute_until > now:
            logger.info(f"Alert for {device.name} is MUTED until {device.mute_until}. Skipping notifications.")
            return
        else:
            # Mute has expired, unmute in database
            device.is_muted = False
            device.mute_until = None
            db.commit()

    # 2. Compile message content
    status_emoji = "🔴" if "offline" in details.lower() else "🟡"
    msg_content = (
        f"\n⚠️ [{alert_type}] Veyla Network Alert!\n"
        f"Device: {device.name}\n"
        f"IP: {device.ip_address}\n"
        f"Category: {device.category}\n"
        f"Location: {device.location or 'N/A'}\n"
        f"Details: {status_emoji} {details}\n"
        f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    )
    
    # 3. LINE Notify Send
    line_token = get_setting(db, "line_notify_token", settings.LINE_NOTIFY_TOKEN)
    if line_token:
        send_line_notification(line_token, msg_content)
        
    # 4. Email Alert for CRITICAL events
    if alert_type == "CRITICAL":
        subject = f"CRITICAL: {device.name} is OFFLINE - Veyla Network"
        send_email_notification(db, subject, msg_content)
