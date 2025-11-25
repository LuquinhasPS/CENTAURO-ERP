"""
Script para popular dados iniciais no banco de dados
"""
import asyncio
import sys
import os
import random
import traceback

# Adiciona o diretório atual ao path para importar app
sys.path.append(os.getcwd())

from app.database import AsyncSessionLocal
from app.models.roles import Role
from app.models.operational import Collaborator, Certification
from app.models.commercial import Client, Contract, Project, ProjectBilling
from sqlalchemy import select

async def seed_roles(db):
    """Cria os cargos padrão"""
    roles_data = [
        {"name": "Coordenador", "description": "Coordenador de projetos"},
        {"name": "Analista", "description": "Analista técnico"},
        {"name": "Técnico", "description": "Técnico de campo"},
        {"name": "Auxiliar", "description": "Auxiliar técnico"},
        {"name": "Assistente", "description": "Assistente administrativo"},
        {"name": "Supervisor", "description": "Supervisor de equipe"},
    ]
    
    print("🔍 Verificando cargos...")
    created_count = 0
    roles_map = {} # Map name -> id
    
    for role_data in roles_data:
        # Check if role already exists
        result = await db.execute(select(Role).where(Role.name == role_data["name"]))
        existing = result.scalar_one_or_none()
        
        if not existing:
            role = Role(**role_data)
            db.add(role)
            await db.flush() # Para pegar o ID
            roles_map[role.name] = role.id
            created_count += 1
            print(f"   ➕ Criando cargo: {role_data['name']}")
        else:
            roles_map[existing.name] = existing.id
            print(f"   ℹ️ Cargo já existe: {role_data['name']}")
    
    if created_count > 0:
        print(f"✅ {created_count} novos cargos criados.")
    
    return roles_map

async def seed_collaborators(db, roles_map):
    """Cria 30 colaboradores fictícios"""
    print("🔍 Verificando colaboradores...")
    
    # Check existing count
    result = await db.execute(select(Collaborator))
    existing_count = len(result.scalars().all())
    
    if existing_count >= 30:
        print(f"✅ Já existem {existing_count} colaboradores. Pulando criação.")
        return

    first_names = ["Lucas", "Ana", "Pedro", "Maria", "João", "Julia", "Carlos", "Fernanda", "Rafael", "Bruna", 
                   "Gustavo", "Camila", "Felipe", "Amanda", "Rodrigo", "Larissa", "Bruno", "Mariana", "Diego", "Letícia"]
    last_names = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes",
                  "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes", "Soares", "Fernandes", "Vieira", "Barbosa"]
    
    roles_list = list(roles_map.keys())
    
    new_collabs = []
    
    for i in range(30):
        name = f"{random.choice(first_names)} {random.choice(last_names)}"
        role_name = random.choice(roles_list)
        role_id = roles_map[role_name]
        
        # Gerar dados fictícios
        cpf_base = f"{random.randint(100, 999)}.{random.randint(100, 999)}.{random.randint(100, 999)}"
        cpf = f"{cpf_base}-{random.randint(10, 99)}"
        
        rg = f"{random.randint(10, 99)}.{random.randint(100, 999)}.{random.randint(100, 999)}-{random.randint(0, 9)}"
        
        email = f"{name.lower().replace(' ', '.')}@centauro.com.br"
        phone = f"(11) 9{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"
        
        salary_base = random.randint(200000, 1200000)
        salary = f"{salary_base / 100:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        
        collab = Collaborator(
            name=name,
            role=role_name,
            role_id=role_id,
            cpf=cpf,
            rg=rg,
            email=email,
            phone=phone,
            salary=salary
        )
        db.add(collab)
        new_collabs.append(name)
    
    print(f"✅ Criando 30 colaboradores fictícios...")
    return len(new_collabs)

async def seed_clients(db):
    """Cria 10 clientes fictícios"""
    print("🔍 Verificando clientes...")
    
    # Check existing count
    result = await db.execute(select(Client))
    existing_count = len(result.scalars().all())
    
    if existing_count >= 10:
        print(f"✅ Já existem {existing_count} clientes. Pulando criação.")
        return

    company_suffixes = ["Ltda", "S.A.", "Soluções", "Tecnologia", "Engenharia", "Comércio", "Serviços", "Logística", "Consultoria", "Sistemas"]
    company_names = ["Alpha", "Beta", "Gamma", "Delta", "Omega", "Sigma", "Titan", "Atlas", "Orion", "Nova", 
                     "Global", "Nacional", "Brasil", "Paulista", "Sul", "Norte", "Leste", "Oeste", "Central", "União"]
    
    streets = ["Av. Paulista", "Rua Augusta", "Av. Faria Lima", "Rua da Consolação", "Av. Brasil", "Rua Oscar Freire", 
               "Av. Rebouças", "Rua Haddock Lobo", "Av. Ibirapuera", "Rua Pamplona"]
    
    new_clients = []
    
    for i in range(10):
        name = f"{random.choice(company_names)} {random.choice(company_suffixes)}"
        client_number = f"{i+1:02d}"
        
        cnpj_base = f"{random.randint(10, 99)}.{random.randint(100, 999)}.{random.randint(100, 999)}/0001"
        cnpj = f"{cnpj_base}-{random.randint(10, 99)}"
        
        contact_person = f"{random.choice(['Carlos', 'Ana', 'Roberto', 'Fernanda', 'Paulo', 'Juliana'])} {random.choice(['Silva', 'Santos', 'Oliveira'])}"
        email = f"contato@{name.lower().split()[0]}.com.br"
        phone = f"(11) 3{random.randint(100, 999)}-{random.randint(1000, 9999)}"
        address = f"{random.choice(streets)}, {random.randint(100, 2000)} - São Paulo, SP"
        
        # Check if client_number already exists to avoid unique constraint error
        result = await db.execute(select(Client).where(Client.client_number == client_number))
        existing = result.scalar_one_or_none()
        
        if not existing:
            client = Client(
                client_number=client_number,
                name=name,
                cnpj=cnpj,
                contact_person=contact_person,
                email=email,
                phone=phone,
                address=address
            )
            db.add(client)
            new_clients.append(name)
    
    print(f"✅ Criando {len(new_clients)} clientes fictícios...")

from app.models.assets import Fleet, FuelType, Insurance
from datetime import date, timedelta

async def seed_insurances(db):
    """Cria 3 seguros fictícios"""
    print("🔍 Verificando seguros...")
    
    result = await db.execute(select(Insurance))
    existing_count = len(result.scalars().all())
    
    if existing_count >= 3:
        print(f"✅ Já existem {existing_count} seguros. Pulando criação.")
        # Return existing ids for fleet seeding
        result = await db.execute(select(Insurance))
        return result.scalars().all()

    insurances_data = [
        {
            "insurance_company": "Porto Seguro", "policy_number": "123456789", 
            "validity": date.today() + timedelta(days=365),
            "claims_info": "Ligar para 0800-727-0800. Apólice no porta-luvas."
        },
        {
            "insurance_company": "Azul Seguros", "policy_number": "987654321", 
            "validity": date.today() + timedelta(days=180),
            "claims_info": "Acionar via app da Azul ou ligar 4004-3700."
        },
        {
            "insurance_company": "Tokio Marine", "policy_number": "456123789", 
            "validity": date.today() + timedelta(days=90),
            "claims_info": "Contato corretor: João (11) 99999-8888."
        }
    ]
    
    created_insurances = []
    for data in insurances_data:
        insurance = Insurance(**data)
        db.add(insurance)
        created_insurances.append(insurance)
    
    await db.flush() # Get IDs
    print(f"✅ Criando {len(created_insurances)} seguros fictícios...")
    return created_insurances

async def seed_certifications(db, collaborators):
    print("📜 Criando certificações...")
    certifications_data = [
        {"name": "NR-10", "type": "NR", "validity": date(2025, 12, 31), "collaborator_id": collaborators[0].id},
        {"name": "ASO Admissional", "type": "ASO", "validity": date(2024, 6, 30), "collaborator_id": collaborators[0].id},
        {"name": "Treinamento em Altura", "type": "TRAINING", "validity": date(2025, 5, 20), "collaborator_id": collaborators[1].id},
        {"name": "NR-35", "type": "NR", "validity": date(2024, 1, 15), "collaborator_id": collaborators[1].id}, # Expired/Expiring
    ]
    
    for cert_data in certifications_data:
        cert = Certification(**cert_data)
        db.add(cert)
    
    await db.commit()
    print(f"✅ {len(certifications_data)} certificações criadas!")

async def seed_fleet(db, insurances):
    """Cria 5 veículos fictícios"""
    print("🔍 Verificando frota...")
    
    # Check existing count
    result = await db.execute(select(Fleet))
    existing_count = len(result.scalars().all())
    
    if existing_count >= 5:
        print(f"✅ Já existem {existing_count} veículos. Pulando criação.")
        return

    vehicles = [
        {
            "license_plate": "ABC-1234", "model": "Hilux", "brand": "Toyota", "year": 2023, 
            "fuel_type": FuelType.DIESEL, "status": "ACTIVE", "color": "Prata",
            "cnpj": "61.198.164/0001-60", "insurance_id": insurances[0].id
        },
        {
            "license_plate": "XYZ-9876", "model": "S10", "brand": "Chevrolet", "year": 2022, 
            "fuel_type": FuelType.FLEX, "status": "ACTIVE", "color": "Branca",
            "cnpj": "33.448.150/0001-11", "insurance_id": insurances[1].id
        },
        {
            "license_plate": "DEF-5678", "model": "Strada", "brand": "Fiat", "year": 2024, 
            "fuel_type": FuelType.FLEX, "status": "MAINTENANCE", "color": "Vermelha",
            "cnpj": "33.164.021/0001-00", "insurance_id": insurances[2].id
        },
        {
            "license_plate": "GHI-9012", "model": "Saveiro", "brand": "Volkswagen", "year": 2021, 
            "fuel_type": FuelType.FLEX, "status": "ACTIVE", "color": "Preta",
            "cnpj": "61.074.175/0001-38", "insurance_id": insurances[0].id
        },
        {
            "license_plate": "JKL-3456", "model": "Ranger", "brand": "Ford", "year": 2023, 
            "fuel_type": FuelType.DIESEL, "status": "ACTIVE", "color": "Azul",
            "cnpj": "61.573.796/0001-66", "insurance_id": insurances[1].id
        }
    ]
    
    new_vehicles = []
    
    for v_data in vehicles:
        # Check if plate exists
        result = await db.execute(select(Fleet).where(Fleet.license_plate == v_data["license_plate"]))
        existing = result.scalar_one_or_none()
        
        if not existing:
            vehicle = Fleet(**v_data)
            db.add(vehicle)
            new_vehicles.append(v_data["license_plate"])
    
    print(f"✅ Criando {len(new_vehicles)} veículos fictícios...")

async def seed_contracts(db, clients):
    """Cria contratos fictícios para os clientes"""
    print("🔍 Verificando contratos...")
    
    result = await db.execute(select(Contract))
    existing_count = len(result.scalars().all())
    
    if existing_count >= 5:
        print(f"✅ Já existem {existing_count} contratos. Pulando criação.")
        result = await db.execute(select(Contract))
        return result.scalars().all()
    
    # Pegar primeiros 5 clientes
    limited_clients = clients[:5] if len(clients) >= 5 else clients
    
    contract_descriptions = [
        "Contrato de prestação de serviços de engenharia elétrica",
        "Contrato de manutenção preventiva de instalações",
        "Contrato de projeto e execução de obras civis",
        "Contrato de consultoria técnica especializada",
        "Contrato de fornecimento e instalação de equipamentos"
    ]
    
    created_contracts = []
    for i, client in enumerate(limited_clients):
        contract = Contract(
            client_id=client.id,
            description=contract_descriptions[i % len(contract_descriptions)]
        )
        db.add(contract)
        created_contracts.append(contract)
    
    await db.flush()  # Get IDs
    print(f"✅ Criando {len(created_contracts)} contratos fictícios...")
    return created_contracts

async def seed_projects(db, clients, contracts):
    """Cria projetos fictícios com billings"""
    print("🔍 Verificando projetos...")
    
    result = await db.execute(select(Project))
    existing_count = len(result.scalars().all())
    
    if existing_count >= 10:
        print(f"✅ Já existem {existing_count} projetos. Pulando criação.")
        return
    
    from decimal import Decimal
    
    project_names = [
        "Retrofit Elétrico Edifício Comercial",
        "Instalação SPDA Industrial",
        "Modernização Subestação 15kV",
        "Projeto Fotovoltaico Residencial",
        "Automação Sistema de Iluminação",
        "Manutenção Preventiva Anual",
        "Upgrade Sistema de Climatização",
        "Instalação Grupo Gerador 500kVA",
        "Regularização Elétrica Prédio",
        "Construção Quadro Geral BT"
    ]
    
    coordinators = ["João Silva", "Maria Santos", "Carlos Oliveira", "Ana Costa", "Pedro Almeida"]
    
    created_projects = []
    
    for i, name in enumerate(project_names):
        # Alternar entre clientes
        client = clients[i % len(clients)]
        # Alguns projetos têm contrato, outros não
        contract = contracts[i % len(contracts)] if i % 3 != 0 and contracts else None
        
        # Valores aleatórios mas realistas
        service_value = Decimal(random.randint(50000, 500000)) / 100  # R$ 500 a R$ 5.000
        material_value = Decimal(random.randint(20000, 300000)) / 100  # R$ 200 a R$ 3.000
        budget = service_value + material_value
        
        # Datas
        start_offset = random.randint(-180, -30)  # Iniciou entre 1-6 meses atrás
        duration = random.randint(30, 180)  # Duração de 1 a 6 meses
        
        start_date = date.today() + timedelta(days=start_offset)
        end_date = start_date + timedelta(days=duration)
        
        project = Project(
            tag=f"PRJ-{2024}-{i+1:03d}",
            project_number=i+1,
            name=name,
            scope=f"Escopo detalhado do projeto {name}. Inclui projeto, fornecimento e instalação.",
            coordinator=coordinators[i % len(coordinators)],
            contract_id=contract.id if contract else None,
            client_id=client.id,
            team_size=random.randint(2, 8),
            service_value=service_value,
            material_value=material_value,
            budget=budget,
            start_date=start_date,
            end_date=end_date,
            estimated_start_date=start_date - timedelta(days=7),
            estimated_end_date=end_date + timedelta(days=7)
        )
        db.add(project)
        await db.flush()  # Para pegar o ID do projeto
        
        # Criar billings para alguns projetos
        if i % 2 == 0:  # 50% dos projetos têm billings
            num_billings = random.randint(1, 4)
            billing_value = budget / num_billings
            
            for b in range(num_billings):
                billing_date = start_date + timedelta(days=30 * b)
                billing = ProjectBilling(
                    project_id=project.id,
                    value=billing_value,
                    date=billing_date,
                    invoice_number=f"NF-{random.randint(1000, 9999)}",
                    description=f"Faturamento parcela {b+1}/{num_billings}"
                )
                db.add(billing)
        
        created_projects.append(name)
    
    print(f"✅ Criando {len(created_projects)} projetos fictícios com billings...")


async def main():
    print("🌱 Iniciando seed de dados...")
    try:
        async with AsyncSessionLocal() as db:
            roles_map = await seed_roles(db)
            await seed_collaborators(db, roles_map)
            await seed_clients(db)
            
            # Fetch collaborators for certifications
            result = await db.execute(select(Collaborator))
            collaborators = result.scalars().all()
            
            if collaborators:
                await seed_certifications(db, collaborators)
            
            insurances = await seed_insurances(db)
            await seed_fleet(db, insurances)
            
            # Fetch clients for contracts and projects
            result = await db.execute(select(Client))
            clients = result.scalars().all()
            
            if clients:
                contracts = await seed_contracts(db, clients)
                if contracts:
                    await seed_projects(db, clients, contracts)
                else:
                    print("⚠️ Nenhum contrato disponível, projetos não serão criados.")
            else:
                print("⚠️ Nenhum cliente disponível, contratos e projetos não serão criados.")
            
            await db.commit()
            print("✨ Concluído com sucesso!")
            
    except Exception as e:
        print(f"❌ Erro ao popular banco de dados: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
