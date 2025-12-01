import sqlite3

def add_cnh_columns():
    conn = sqlite3.connect('./centauro.db')
    cursor = conn.cursor()
    
    columns = [
        ("cnh_number", "VARCHAR"),
        ("cnh_category", "VARCHAR"),
        ("cnh_validity", "DATE")
    ]
    
    for col_name, col_type in columns:
        try:
            cursor.execute(f"ALTER TABLE collaborators ADD COLUMN {col_name} {col_type}")
            print(f"Column '{col_name}' added successfully.")
        except sqlite3.OperationalError as e:
            print(f"Error adding '{col_name}': {e}")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    add_cnh_columns()
