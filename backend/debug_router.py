import asyncio
import sys
import os
sys.path.append(os.getcwd())
from app.database import AsyncSessionLocal
from app.routers.commercial import get_all_billings
from app.schemas.commercial import ProjectBillingResponse
from pydantic import TypeAdapter

async def main():
    with open("debug_output.txt", "w") as f:
        f.write("Debugging get_all_billings...\n")
        async with AsyncSessionLocal() as db:
            try:
                billings = await get_all_billings(db)
                f.write(f"Got {len(billings)} billings from router.\n")
                
                # Try to validate against schema
                adapter = TypeAdapter(list[ProjectBillingResponse])
                try:
                    validated = adapter.validate_python(billings, from_attributes=True)
                    f.write("Validation Successful!\n")
                except Exception as e:
                    if hasattr(e, 'errors'):
                        f.write(f"Validation Error: {e.errors()[0]}\n")
                    else:
                        f.write(f"Validation Error: {e}\n")
                    
            except Exception as e:
                f.write(f"Router Error: {e}\n")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
