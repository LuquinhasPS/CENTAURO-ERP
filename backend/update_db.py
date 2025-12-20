
import sqlite3
import os

db_file = "centauro.db"

if not os.path.exists(db_file):
    print(f"Database {db_file} not found in current directory.")
else:
    print(f"Updating {db_file}...")
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()
    try:
        # Add registration_number column
        # Check if exists first
        cursor.execute("PRAGMA table_info(collaborators)")
        columns = cursor.fetchall()
        col_names = [c[1] for c in columns]
        
        if "registration_number" not in col_names:
            print("Adding registration_number column...")
            cursor.execute("ALTER TABLE collaborators ADD COLUMN registration_number VARCHAR DEFAULT NULL")
            conn.commit()
            print("Column added successfully.")
        else:
            print("Column registration_number already exists.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
