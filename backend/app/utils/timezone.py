"""
Timezone utilities for Centauro ERP.
All datetime operations should use this module to ensure consistency with Brasilia Time.
"""
from datetime import datetime, date, timedelta
import pytz

# Brazil Timezone (Brasilia Time / UTC-3)
BRAZIL_TZ = pytz.timezone("America/Sao_Paulo")

def now_brazil() -> datetime:
    """Get current datetime in Brasilia timezone."""
    return datetime.now(BRAZIL_TZ)

def today_brazil() -> date:
    """Get current date in Brasilia timezone."""
    return datetime.now(BRAZIL_TZ).date()

def start_of_day_brazil(dt: date = None) -> datetime:
    """Get the start of day (00:00:00) in Brasilia timezone."""
    if dt is None:
        dt = today_brazil()
    return BRAZIL_TZ.localize(datetime(dt.year, dt.month, dt.day, 0, 0, 0))

def end_of_day_brazil(dt: date = None) -> datetime:
    """Get the end of day (23:59:59) in Brasilia timezone."""
    if dt is None:
        dt = today_brazil()
    return BRAZIL_TZ.localize(datetime(dt.year, dt.month, dt.day, 23, 59, 59))
