from app.auth import get_password_hash, verify_password

try:
    pwd = "senha123"
    print(f"Hashing password: {pwd}")
    hashed = get_password_hash(pwd)
    print(f"Hashed: {hashed}")
    
    print("Verifying...")
    print(verify_password(pwd, hashed))
    
    print("Test complete.")
except Exception as e:
    print(f"Error: {e}")
