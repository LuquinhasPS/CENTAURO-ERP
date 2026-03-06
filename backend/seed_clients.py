import traceback
import asyncio
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal, engine, Base
from app.models.commercial import Client
from sqlalchemy.future import select

async def seed_clients_from_excel(file_path: str):
    print(f"Lendo o arquivo {file_path}...")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    try:
        df = pd.read_excel(file_path, engine='openpyxl')
    except Exception as e:
        print(f"Erro ao ler o Excel: {e}")
        return
        
    df = df.dropna(subset=['NOME DO CLIENTE']) 

    async with AsyncSessionLocal() as db:
        try:
            clients_added = 0
            clients_skipped = 0
            
            added_names = set()
            added_numbers = set()
            
            for index, row in df.iterrows():
                nome_cliente = str(row['NOME DO CLIENTE']).strip()
                numero_cliente = str(row.get('CÓDIGO', '')).strip()
                
                if numero_cliente.lower() == 'nan' or not numero_cliente:
                    numero_cliente = None
                else:
                    try:
                        numero_cliente = str(int(float(numero_cliente)))
                    except ValueError:
                        pass
                
                if nome_cliente in added_names or (numero_cliente and numero_cliente in added_numbers):
                    print(f"Skipping {nome_cliente} due to duplicate within Excel file.")
                    clients_skipped += 1
                    continue

                # Check for either existing name AND also existing client_number
                stmt = select(Client).where(Client.name == nome_cliente)
                result = await db.execute(stmt)
                existing = result.scalar_one_or_none()
                
                if existing:
                    clients_skipped += 1
                    continue
                    
                if numero_cliente:
                    stmt2 = select(Client).where(Client.client_number == numero_cliente)
                    result2 = await db.execute(stmt2)
                    existing_number = result2.scalar_one_or_none()
                    if existing_number:
                        print(f"Skipping {nome_cliente} due to duplicate Client Number {numero_cliente} in DB.")
                        clients_skipped += 1
                        continue

                new_client = Client(
                    name=nome_cliente,
                    client_number=numero_cliente
                )
                
                added_names.add(nome_cliente)
                if numero_cliente:
                    added_numbers.add(numero_cliente)
                
                db.add(new_client)
                clients_added += 1
            
            await db.commit()
            print(f"Sucesso! {clients_added} clientes foram inseridos.")
            if clients_skipped > 0:
                print(f"Aviso: {clients_skipped} clientes foram ignorados pois ja existiam no banco ou tinham codigo duplicado.")
            
        except Exception as e:
            await db.rollback()
            print(f"Erro ao importar dados: {e}")
            traceback.print_exc()

if __name__ == "__main__":
    arquivo_excel = r"C:\Users\Centauro\Downloads\Clientes.xlsm"
    asyncio.run(seed_clients_from_excel(arquivo_excel))
