import asyncio
import pandas as pd
import sys
import os
from datetime import datetime
from sqlalchemy import select

from dotenv import load_dotenv

# Configura caminhos relativos ao script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)

# Carrega o .env da pasta backend antes de qualquer coisa
load_dotenv(os.path.join(BASE_DIR, ".env"))

# Adicionar o diretório atual ao sys.path para importar 'app'
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

# Se não estiver no terminal nem no .env, usa o SQLite local
if "DATABASE_URL" not in os.environ:
    os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{os.path.join(BASE_DIR, 'centauro.db')}"

# Debug: mostra qual banco estamos usando (mas só o início pra segurança)
db_url = os.environ.get("DATABASE_URL", "")
if "postgresql" in db_url:
    print(f"🚀 Conectando ao Banco de DEPLOY (PostgreSQL)...")
else:
    print(f"🏠 Conectando ao Banco LOCAL (SQLite): {db_url}")

from app.database import AsyncSessionLocal
from app.models.operational import Collaborator, Certification, CertificationType

import unidecode

EXCEL_PATH = os.path.join(ROOT_DIR, "Controle de Treinamentos - Centauro.xlsx")

def normalize_name(name):
    if not name or name == 'nan':
        return ""
    # Remove acentos, espaços extras e coloca em minúsculo
    return unidecode.unidecode(str(name).strip().lower())

async def import_trainings():
    if not os.path.exists(EXCEL_PATH):
        print(f"❌ Arquivo {EXCEL_PATH} não encontrado.")
        return

    print(f"📖 Lendo {EXCEL_PATH}...")
    try:
        # Pega o header real na linha 0
        df_raw = pd.read_excel(EXCEL_PATH, header=None)
        nr_headers = df_raw.iloc[0].tolist()
        data_rows = df_raw.iloc[4:]
    except Exception as e:
        print(f"❌ Erro ao ler Excel: {e}")
        return

    async with AsyncSessionLocal() as db:
        # 1. Buscar todos os colaboradores para mapeamento de nome
        result = await db.execute(select(Collaborator))
        collaborators = result.scalars().all()
        
        # Mapeia tanto o nome normalizado quanto o original pra garantir
        collab_map = {normalize_name(c.name): c.id for c in collaborators}
        
        print(f"👥 Banco: {len(collaborators)} colaboradores carregados.")

        count_added = 0
        count_updated = 0
        missing_names = []
        
        for idx, row in data_rows.iterrows():
            raw_name = str(row[0]).strip()
            if not raw_name or raw_name == 'nan':
                continue
            
            norm_name = normalize_name(raw_name)
            collab_id = collab_map.get(norm_name)
            
            if not collab_id:
                # Tenta match parcial simples
                found_partial = False
                for db_norm, db_id in collab_map.items():
                    if norm_name in db_norm or db_norm in norm_name:
                        collab_id = db_id
                        found_partial = True
                        break
                
                if not found_partial:
                    missing_names.append(raw_name)
                    continue

            # Processar cada coluna de NR (começa da 1)
            for col_idx in range(1, len(nr_headers)):
                nr_name = str(nr_headers[col_idx]).strip()
                if not nr_name or nr_name == 'nan':
                    continue
                
                validity_date = row[col_idx]
                
                # Se não for uma data válida, pula
                # Pode vir como string as vezes se o excel for ruim
                if pd.isna(validity_date):
                    continue
                
                try:
                    if isinstance(validity_date, str):
                        # Tenta parsear string de data se vier zoado
                        validity_date = pd.to_datetime(validity_date, errors='coerce')
                    
                    if pd.isna(validity_date):
                        continue
                        
                    # Converter para objeto date do python
                    py_date = validity_date.date() if hasattr(validity_date, 'date') else validity_date
                except:
                    continue

                # Definir o tipo de certificação
                # NR-06, NR-10, NR-35...
                upper_nr = nr_name.upper()
                cert_type = CertificationType.NR
                
                if "ASO" in upper_nr or "P.S.A" in upper_nr:
                    cert_type = CertificationType.ASO
                elif "NR" not in upper_nr:
                    cert_type = CertificationType.TRAINING

                # Verificar se já existe essa certificação para esse colaborador
                stmt = select(Certification).where(
                    Certification.collaborator_id == collab_id,
                    Certification.name == nr_name
                )
                res = await db.execute(stmt)
                existing_cert = res.scalars().first()

                if existing_cert:
                    # Só atualiza se a data for diferente pra não dar commit à toa
                    if existing_cert.validity != py_date or existing_cert.type != cert_type:
                        existing_cert.validity = py_date
                        existing_cert.type = cert_type
                        count_updated += 1
                else:
                    new_cert = Certification(
                        name=nr_name,
                        type=cert_type,
                        validity=py_date,
                        collaborator_id=collab_id
                    )
                    db.add(new_cert)
                    count_added += 1

        if missing_names:
            print(f"⚠️ {len(missing_names)} colaboradores não encontrados: {missing_names[:5]}...")
        
        await db.commit()
        print(f"✅ Sincronização concluída!")
        print(f"➕ Novas certificações: {count_added}")
        print(f"🔄 Atualizadas: {count_updated}")

if __name__ == "__main__":
    asyncio.run(import_trainings())
