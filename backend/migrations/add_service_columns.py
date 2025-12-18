import sqlite3
import os

# Get the absolute path to the database
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app", "centauro.db")

def add_columns():
    if not os.path.exists(DB_PATH):
        # Fallback to local dir if running from backend root
        DB_PATH_LOCAL = "centauro.db"
        if os.path.exists(DB_PATH_LOCAL):
            DB_PATH_FINAL = DB_PATH_LOCAL
        else:
             print(f"Error: Database not found at {DB_PATH}")
             return
    else:
        DB_PATH_FINAL = DB_PATH
        
    print(f"Connecting to database at {DB_PATH_FINAL}...")
    conn = sqlite3.connect(DB_PATH_FINAL)
    cursor = conn.cursor()

    columns_to_add = [
        ("category", "VARCHAR DEFAULT 'MATERIAL'"),
        ("service_start_date", "DATE"),
        ("service_end_date", "DATE"),
        ("is_indefinite_term", "BOOLEAN DEFAULT 0")
    ]

    try:
        cursor.execute("PRAGMA table_info(purchase_requests)")
        existing_columns = [info[1] for info in cursor.fetchall()]
        
        for col_name, col_type in columns_to_add:
            if col_name in existing_columns:
                print(f"Column '{col_name}' already exists.")
            else:
                print(f"Adding column '{col_name}'...")
                cursor.execute(f"ALTER TABLE purchase_requests ADD COLUMN {col_name} {col_type}")
                print(f"Column '{col_name}' added.")
        
        conn.commit()
        print("Migration completed successfully.")
            
    except Exception as e:
        print(f"An error occurred: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_columns()
