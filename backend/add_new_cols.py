import sqlite3

conn = sqlite3.connect('centauro.db')
cursor = conn.cursor()

# Check and Add company_id
try:
    cursor.execute("ALTER TABLE projects ADD COLUMN company_id INTEGER")
    print("Added company_id")
except sqlite3.OperationalError as e:
    print(f"company_id might already exist: {e}")

# Check and Add estimated_days
try:
    cursor.execute("ALTER TABLE projects ADD COLUMN estimated_days INTEGER")
    print("Added estimated_days")
except sqlite3.OperationalError as e:
    print(f"estimated_days might already exist: {e}")

conn.commit()
conn.close()
