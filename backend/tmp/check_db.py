import asyncio
import os
import sys

# Add current directory to path
sys.path.append(os.getcwd())

from app.database import engine
from sqlalchemy import text

async def test():
    try:
        # Connect to DB
        async with engine.connect() as conn:
            # Query the table
            res = await conn.execute(text('SELECT * FROM asset_requests'))
            rows = res.fetchall()
            print(f'#FOUND_REQUESTS# {len(rows)}')
            for row in rows:
                print(row)
    except Exception as e:
        print(f'#ERROR# {e}')

if __name__ == '__main__':
    asyncio.run(test())
