import sqlite3

def add_column():
    conn = sqlite3.connect('./centauro.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE projects ADD COLUMN status VARCHAR DEFAULT 'Em Andamento'")
        print("Column 'status' added successfully.")
    except sqlite3.OperationalError as e:
        print(f"Error: {e}")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    add_column()
