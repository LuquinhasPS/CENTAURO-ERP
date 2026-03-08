import sqlite3
import os

db_path = 'backend/centauro.db'

print(f"Connecting to {db_path}...")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE fleet ADD COLUMN deactivation_date DATE")
    conn.commit()
    print("✅ Column 'deactivation_date' added to fleet successfully.")
except Exception as e:
    if "duplicate column name" in str(e).lower():
        print("ℹ️ Column 'deactivation_date' already exists in fleet.")
    else:
        print(f"❌ Error adding column to fleet: {e}")

try:
    cursor.execute("ALTER TABLE tools ADD COLUMN deactivation_date DATE")
    conn.commit()
    print("✅ Column 'deactivation_date' added to tools successfully.")
except Exception as e:
    if "duplicate column name" in str(e).lower():
        print("ℹ️ Column 'deactivation_date' already exists in tools.")
    else:
        print(f"❌ Error adding column to tools: {e}")

conn.close()
