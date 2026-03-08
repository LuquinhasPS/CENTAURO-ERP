import os
import traceback
import asyncio
import pandas as pd
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal, engine, Base
from app.models.operational import Collaborator
from sqlalchemy.future import select

async def seed_equipe_from_excel(file_path: str):
    print(f"Lendo o arquivo {file_path}...")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    try:
        # A linha 3 do Excel (índice 2) contém o cabeçalho
        df = pd.read_excel(file_path, engine='openpyxl', header=2)
    except Exception as e:
        print(f"Erro ao ler o Excel: {e}")
        return
        
    df = df.dropna(subset=['Nome']) 

    async with AsyncSessionLocal() as db:
        try:
            collabs_added = 0
            collabs_skipped = 0
            
            added_cpfs = set()
            added_matriculas = set()
            
            for index, row in df.iterrows():
                nome = str(row['Nome']).strip()
                
                matricula = str(row.get('Matricula', ''))
                if matricula.lower() == 'nan' or not matricula:
                    matricula = None
                else:
                    try:
                        matricula = str(int(float(matricula)))
                    except ValueError:
                        matricula = matricula.strip()

                cpf = str(row.get('CPF', '')).strip()
                if cpf.lower() == 'nan' or not cpf:
                    cpf = None
                    
                rg = str(row.get('RG', '')).strip()
                if rg.lower() == 'nan' or not rg:
                    rg = None
                    
                email = str(row.get('Email particular', '')).strip()
                if email.lower() == 'nan' or not email:
                    email = None
                    
                celular = str(row.get('Celular', '')).strip()
                if celular.lower() == 'nan' or not celular:
                    celular = None
                    
                cargo = str(row.get('Cargo', '')).strip()
                if cargo.lower() == 'nan' or not cargo:
                    cargo = None
                    
                cnh = str(row.get('CNH', '')).strip()
                if cnh.lower() == 'nan' or not cnh:
                    cnh = None
                else:
                    try:
                        cnh = str(int(float(cnh)))
                    except ValueError:
                        cnh = cnh.strip()

                cat_cnh = str(row.get('Cat. CNH', '')).strip()
                if cat_cnh.lower() == 'nan' or not cat_cnh:
                    cat_cnh = None
                    
                def parse_date(col_name):
                    val = row.get(col_name)
                    if pd.isnull(val):
                        return None
                    if isinstance(val, datetime):
                        return val.date()
                    try:
                        return pd.to_datetime(val).date()
                    except:
                        return None

                data_nasc = parse_date('Data Nasc.')
                venc_cnh = parse_date('Venc. CNH')
                admissao = parse_date('Admissão')
                
                existing = None
                if cpf:
                    stmt = select(Collaborator).where(Collaborator.cpf == cpf)
                    result = await db.execute(stmt)
                    existing = result.scalar_one_or_none()
                
                if not existing and matricula:
                    stmt = select(Collaborator).where(Collaborator.registration_number == matricula)
                    result = await db.execute(stmt)
                    existing = result.scalar_one_or_none()
                    
                if not existing:
                    stmt = select(Collaborator).where(Collaborator.name == nome)
                    result = await db.execute(stmt)
                    existing = result.scalar_one_or_none()

                if (cpf and cpf in added_cpfs) or (matricula and matricula in added_matriculas):
                    print(f"Pulando {nome}: duplicado no próprio arquivo Excel.")
                    collabs_skipped += 1
                    continue

                if existing:
                    print(f"Pulando {nome}: já existe no banco de dados.")
                    collabs_skipped += 1
                    continue

                if cpf:
                    added_cpfs.add(cpf)
                if matricula:
                    added_matriculas.add(matricula)

                new_collab = Collaborator(
                    name=nome,
                    registration_number=matricula,
                    cpf=cpf,
                    rg=rg,
                    email=email,
                    phone=celular,
                    role=cargo,
                    cnh_number=cnh,
                    cnh_category=cat_cnh,
                    cnh_validity=venc_cnh,
                    birth_date=data_nasc,
                    admission_date=admissao
                )
                
                db.add(new_collab)
                collabs_added += 1
            
            await db.commit()
            print(f"Sucesso! {collabs_added} colaboradores foram inseridos.")
            if collabs_skipped > 0:
                print(f"Aviso: {collabs_skipped} colaboradores foram ignorados pois já existiam no banco.")
            
        except Exception as e:
            await db.rollback()
            print(f"Erro ao importar dados: {e}")
            traceback.print_exc()

if __name__ == "__main__":
    arquivo_excel = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "EQUIPE CENTAURO.xlsx")
    asyncio.run(seed_equipe_from_excel(arquivo_excel))
