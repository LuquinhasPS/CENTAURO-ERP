
import sqlite3
import os

# Adjust path to where centauro.db usually is. 
# Usually in backend root or app root.
db_path = 'centauro.db'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    # Try absolute path 
    db_path = r'c:\Users\Centauro\OneDrive - centaurotelecom.com.br\Documentos\GitHub\CENTAURO-ERP-2\backend\centauro.db'

if not os.path.exists(db_path):
    print(f"Database still not found at {db_path}")
    exit(1)

print(f"Connecting to {db_path}...")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("Attempting to add installment_count column...")
    cursor.execute("ALTER TABLE purchase_items ADD COLUMN installment_count INTEGER DEFAULT 1")
    conn.commit()
    print("✅ Column 'installment_count' added successfully.")
except Exception as e:
    if "duplicate column name" in str(e).lower():
        print("ℹ️ Column 'installment_count' already exists.")
    else:
        print(f"❌ Error adding column: {e}")

conn.close()
