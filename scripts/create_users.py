import pandas as pd
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
import sys
from passlib.context import CryptContext

# 1. Setup Password Hashing (Argon2 as per app/auth.py)
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

# 2. Database & File Paths
DEPLOY_URL = "postgresql+asyncpg://postgres:HdRksQOjchuaJZAytjNIsrZnuWWnWcAZ@centerbeam.proxy.rlwy.net:24604/railway"
EXCEL_PATH = r"c:\Users\Centauro\Meu Canto\GitHub\Centauro\CENTAURO-ERP\Usuarios_para_criar.xlsx"
DEFAULT_PASSWORD = "Centauro@2024"
DEFAULT_ROLE = "VISUALIZADOR"

async def create_users():
    # Read Excel (Email Col 0, Matricula Col 1)
    # Skipping header row if it exists? Let's check first row content.
    df = pd.read_excel(EXCEL_PATH)
    # Correcting data if header was already set by pandas (it usually is)
    # In my preview, pandas correctly identified 'email' and 'matricula' as header
    # Let's ensure column names match what we expect.
    
    print(f"Read {len(df)} rows from Excel.")
    
    engine = create_async_engine(DEPLOY_URL)
    hashed_pwd = get_password_hash(DEFAULT_PASSWORD)
    
    created_count = 0
    skipped_count = 0
    error_count = 0
    
    async with engine.begin() as conn:
        for idx, row in df.iterrows():
            email = str(row[0]).strip().lower()
            matricula = str(row[1]).strip()
            
            if not email or '@' not in email:
                continue
            
            # Check if user already exists
            res_exists = await conn.execute(text("SELECT id FROM users WHERE email = :e"), {"e": email})
            if res_exists.one_or_none():
                print(f"[-] Skipped: {email} (User already exists)")
                skipped_count += 1
                continue
            
            # Find Collaborator ID by matricula (registration_number)
            res_collab = await conn.execute(
                text("SELECT id FROM collaborators WHERE registration_number = :m"), 
                {"m": matricula}
            )
            collab = res_collab.one_or_none()
            
            if not collab:
                print(f"[-] Error: {email} (Collab matricula {matricula} not found)")
                error_count += 1
                continue
            
            collab_id = collab[0]
            
            # CREATE USER
            try:
                await conn.execute(
                    text("""
                        INSERT INTO users (email, password_hash, role, is_superuser, collaborator_id)
                        VALUES (:email, :pwd, :role, false, :cid)
                    """),
                    {
                        "email": email,
                        "pwd": hashed_pwd,
                        "role": DEFAULT_ROLE,
                        "cid": collab_id
                    }
                )
                print(f"[+] Created: {email} -> Collab ID {collab_id}")
                created_count += 1
            except Exception as e:
                print(f"[-] Database Error for {email}: {e}")
                error_count += 1
                
    await engine.dispose()
    
    print("\n--- FINALIZAÇÃO ---")
    print(f"Novos usuários criados: {created_count}")
    print(f"Ignorados (já existiam): {skipped_count}")
    print(f"Erros (matrícula não encontrada/DB): {error_count}")
    print(f"Total processado: {created_count + skipped_count + error_count}")

if __name__ == "__main__":
    asyncio.run(create_users())
