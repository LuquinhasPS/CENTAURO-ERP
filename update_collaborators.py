import sqlite3
import os

db_path = 'backend/centauro.db'

print(f"Connecting to {db_path}...")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

columns_to_add = [
    ("cnh_number", "VARCHAR"),
    ("cnh_category", "VARCHAR"),
    ("cnh_validity", "DATE"),
    ("admission_date", "DATE"),
    ("birth_date", "DATE"),
    ("termination_date", "DATE"),
]

for col_name, col_type in columns_to_add:
    try:
        cursor.execute(f"ALTER TABLE collaborators ADD COLUMN {col_name} {col_type}")
        conn.commit()
        print(f"✅ Column '{col_name}' added successfully.")
    except Exception as e:
        if "duplicate column name" in str(e).lower():
            print(f"ℹ️ Column '{col_name}' already exists.")
        else:
            print(f"❌ Error adding column {col_name}: {e}")

conn.close()
