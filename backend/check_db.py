import asyncio
import sys
import os
sys.path.append(os.getcwd())
from app.database import AsyncSessionLocal
from app.models.commercial import ProjectBilling
from sqlalchemy import select

async def main():
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(ProjectBilling))
            billings = result.scalars().all()
            
            with open("db_check_output.txt", "w") as f:
                f.write(f"Billings count: {len(billings)}\n")
                if billings:
                    b = billings[0]
                    f.write(f"First Billing: ID={b.id}, Value={b.value} (Type: {type(b.value)}), Status={b.status}, ProjectID={b.project_id}\n")
                    
                    # Check for None in required fields
                    for i, bill in enumerate(billings):
                        if bill.value is None:
                            f.write(f"Billing {bill.id} has None value!\n")
                        if bill.project_id is None:
                            f.write(f"Billing {bill.id} has None project_id!\n")
    except Exception as e:
        with open("db_check_output.txt", "w") as f:
            f.write(f"Error: {e}\n")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
