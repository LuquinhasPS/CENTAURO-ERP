
import sqlite3
import os

db_file = "centauro.db"

if not os.path.exists(db_file):
    print(f"Database {db_file} not found.")
else:
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, name, registration_number FROM collaborators LIMIT 5")
        rows = cursor.fetchall()
        print(f"Found {len(rows)} collaborators:")
        for row in rows:
            print(row)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
