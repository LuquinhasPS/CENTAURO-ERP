import pandas as pd
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
import sys

# DATABASE URL FOR DEPLOY
DEPLOY_URL = "postgresql+asyncpg://postgres:HdRksQOjchuaJZAytjNIsrZnuWWnWcAZ@centerbeam.proxy.rlwy.net:24604/railway"
EXCEL_PATH = r"c:\Users\Centauro\Meu Canto\GitHub\Centauro\CENTAURO-ERP\Usuarios_para_criar.xlsx"

async def preview_creation():
    # 1. Read Excel
    print(f"Reading {EXCEL_PATH}...")
    try:
        # User defined: Column A (Email), Column B (Registration Number)
        # Assuming no header or header is at row 0? Let's check first 5 rows.
        df = pd.read_excel(EXCEL_PATH, header=None)
        print("Excel Preview (First 5 rows):")
        print(df.head())
        
        # Mapping Emails to Matriculas
        # Email as Col 0, Matricula as Col 1
        to_create = []
        for index, row in df.iterrows():
            email = str(row[0]).strip()
            matricula = str(row[1]).strip()
            # Basic validation
            if '@' in email and len(matricula) > 0:
                to_create.append({"email": email, "matricula": matricula})
                
        print(f"Found {len(to_create)} candidate accounts to create.")
        
    except Exception as e:
        print(f"EXCEL ERROR: {e}")
        return

    # 2. Database Connection to check collaborator IDs
    print(f"Connecting to production DB...")
    engine = create_async_engine(DEPLOY_URL)
    
    results = []
    async with engine.connect() as conn:
        for user_data in to_create:
            email = user_data["email"]
            matricula = user_data["matricula"]
            
            # Search for collaborator ID
            query = text("SELECT id, name FROM collaborators WHERE registration_number = :m")
            res = await conn.execute(query, {"m": matricula})
            collab = res.one_or_none()
            
            if collab:
                results.append({
                    "email": email,
                    "matricula": matricula,
                    "collab_id": collab[0],
                    "name": collab[1],
                    "status": "READY"
                })
            else:
                results.append({
                    "email": email,
                    "matricula": matricula,
                    "collab_id": None,
                    "name": "NÃO ENCONTRADO",
                    "status": "ERROR"
                })
                
    await engine.dispose()
    
    # 3. Print Report
    print("\n--- PROPOSTA DE CRIAÇÃO (TOTAL: {0}) ---".format(len(results)))
    print("{:<40} | {:<10} | {:<10} | {:<20} | {:<10}".format("EMAIL", "MATRICULA", "ID COLLAB", "NOME", "STATUS"))
    print("-" * 100)
    for r in results:
        print("{:<40} | {:<10} | {:<10} | {:<20} | {:<10}".format(
            r["email"], r["matricula"], str(r["collab_id"]), r["name"][:20], r["status"]
        ))
    
    print("\n[!] Nada foi alterado no banco ainda.")

if __name__ == "__main__":
    asyncio.run(preview_creation())
