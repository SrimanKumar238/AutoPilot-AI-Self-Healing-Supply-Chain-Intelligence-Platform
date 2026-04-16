"""MFA service – send OTP via email using FastAPI-Mail / SMTP."""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings
import structlog

logger = structlog.get_logger(__name__)


class MFAService:
    def __init__(self, redis_client=None):
        self.redis = redis_client

    def send_otp_email(self, email: str, otp: str, username: str):
        """Send OTP via SMTP. Non-blocking best-effort."""
        html = f"""
        <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#0f172a;
                    border-radius:12px;padding:32px;color:#e2e8f0">
          <h2 style="color:#38bdf8;margin-bottom:8px">🔐 AutoPilot AI – Verification Code</h2>
          <p>Hi <strong>{username}</strong>,</p>
          <p>Your one-time password for login:</p>
          <div style="font-size:48px;font-weight:900;letter-spacing:12px;
                      color:#fff;background:#1e293b;border-radius:8px;
                      padding:20px;text-align:center;margin:20px 0">{otp}</div>
          <p style="color:#94a3b8;font-size:13px">
            This code expires in {settings.OTP_EXPIRE_MINUTES} minutes.<br>
            If you didn't request this, please ignore.
          </p>
          <hr style="border-color:#1e293b;margin:24px 0">
          <p style="color:#475569;font-size:12px">AutoPilot AI – Self-Healing Supply Chain</p>
        </div>
        """
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"[AutoPilot AI] Your OTP: {otp}"
            msg["From"] = settings.SMTP_USER
            msg["To"] = email
            msg.attach(MIMEText(html, "html"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.ehlo()
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_USER, email, msg.as_string())
            logger.info("OTP email sent", email_masked=email[:3] + "***")
        except Exception as e:
            logger.error("OTP email failed", error=str(e))
            # Don't raise – OTP is still stored in Redis for testing
