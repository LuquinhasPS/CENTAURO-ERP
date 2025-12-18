import sqlite3
import os

# Get the absolute path to the database
# Assumes this script is in the backend/ directory, same as centauro.db
DB_PATH = os.path.join(os.path.dirname(__file__), "centauro.db")

def add_column():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    print(f"Connecting to database at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(purchase_requests)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "shipping_cost" in columns:
            print("Column 'shipping_cost' already exists in 'purchase_requests'.")
        else:
            print("Adding column 'shipping_cost' to 'purchase_requests'...")
            cursor.execute("ALTER TABLE purchase_requests ADD COLUMN shipping_cost FLOAT DEFAULT 0.0")
            conn.commit()
            print("Column added successfully.")
            
    except Exception as e:
        print(f"An error occurred: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_column()
