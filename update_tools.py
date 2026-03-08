import sqlite3
import os

db_path = 'backend/centauro.db'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

columns = [
    ("ALTER TABLE tools ADD COLUMN category VARCHAR", "category"),
    ("ALTER TABLE tools ADD COLUMN condition VARCHAR", "condition"),
    ("ALTER TABLE tools ADD COLUMN next_maintenance DATE", "next_maintenance"),
]

for cmd, col_name in columns:
    try:
        cursor.execute(cmd)
        conn.commit()
        print(f"✅ Column '{col_name}' added to tools successfully.")
    except Exception as e:
        if "duplicate column name" in str(e).lower():
            print(f"ℹ️ Column '{col_name}' already exists in tools.")
        else:
            print(f"❌ Error adding column '{col_name}' to tools: {e}")

conn.close()
