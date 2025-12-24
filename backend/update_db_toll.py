
import sqlite3
import os

db_path = r'c:\Users\Centauro\OneDrive - centaurotelecom.com.br\Documentos\GitHub\CENTAURO-ERP-2\backend\centauro.db'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("Creating vehicle_toll_costs table...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS vehicle_toll_costs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        competence_date DATE NOT NULL,
        total_cost FLOAT NOT NULL,
        FOREIGN KEY (vehicle_id) REFERENCES fleet (id),
        UNIQUE(vehicle_id, competence_date)
    );
    """)
    conn.commit()
    print("✅ Table created successfully.")
except Exception as e:
    print(f"❌ Error creating table: {e}")

conn.close()
