from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.services.email_service import email_service
from datetime import datetime
import pytz

# Timezone configuration - Brazil (Brasilia Time)
BRAZIL_TZ = pytz.timezone("America/Sao_Paulo")

# Global scheduler instance
scheduler = AsyncIOScheduler(timezone=BRAZIL_TZ)

async def send_scheduled_daily_briefing():
    """
    Job function to send daily briefing email.
    Runs every day at 8:00 AM (Brasilia Time / UTC-3).
    """
    now = datetime.now(BRAZIL_TZ)
    print(f"[Scheduler] Starting daily briefing job at {now.strftime('%d/%m/%Y %H:%M:%S')} (Brasilia Time)")
    try:
        result = await email_service.send_daily_briefing()
        print(f"[Scheduler] Daily briefing completed: {result}")
    except Exception as e:
        print(f"[Scheduler] Error sending daily briefing: {e}")

def start_scheduler():
    """
    Configures and starts the APScheduler.
    Called from main.py on application startup.
    """
    # Schedule daily briefing at 8:00 AM (Brasilia Time UTC-3)
    scheduler.add_job(
        send_scheduled_daily_briefing,
        trigger=CronTrigger(hour='8,16', minute=0, timezone=BRAZIL_TZ),
        id="daily_briefing_email",
        name="Send Daily Briefing Email",
        replace_existing=True
    )
    
    scheduler.start()
    
    # Log next run time
    job = scheduler.get_job("daily_briefing_email")
    if job:
        next_run = job.next_run_time.strftime("%d/%m/%Y %H:%M:%S")
        print(f"[Scheduler] Daily briefing scheduled for 8:00 AM (Brasilia Time)")
        print(f"[Scheduler] Next run: {next_run}")

def stop_scheduler():
    """
    Gracefully shuts down the scheduler.
    Called from main.py on application shutdown.
    """
    if scheduler.running:
        scheduler.shutdown()
        print("[Scheduler] Scheduler stopped")
