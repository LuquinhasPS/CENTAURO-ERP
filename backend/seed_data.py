"""
Script para popular dados iniciais no banco de dados
"""
import asyncio
import sys
import os
import random
import traceback
from datetime import date, timedelta, datetime

# Adiciona o diretório atual ao path para importar app
sys.path.append(os.getcwd())

from app.database import AsyncSessionLocal
from app.models.roles import Role
from app.models.teams import Team
from app.models.operational import Collaborator, Certification, CertificationType, Allocation, ResourceType, AllocationType, CollaboratorEducation, EducationType, CollaboratorReview
from app.models.commercial import Client, Contract, Project, ProjectBilling, ProjectFeedback, FeedbackType
from app.models.project_resources import ProjectCollaborator, ProjectVehicle, ProjectTool
from app.models.assets import Fleet, FuelType, Insurance, Tool, ToolStatus
from app.models.tickets import Ticket, TicketStatus, TicketPriority
from app.models.purchases import PurchaseRequest, PurchaseItem
from app.models.users import User, UserRole
from app.auth import get_password_hash
from sqlalchemy import select, delete, update

async def clear_data(db):
    """Limpa todos os dados do banco para um seed limpo"""
    print("🧹 Limpando dados existentes...")
    
    # Ordem importa devido a Foreign Keys
    await db.execute(delete(PurchaseItem))
    await db.execute(delete(PurchaseRequest))
    await db.execute(delete(Ticket))
    await db.execute(delete(Allocation))
    await db.execute(delete(ProjectBilling))
    await db.execute(delete(ProjectFeedback))
    await db.execute(delete(ProjectCollaborator))
    await db.execute(delete(ProjectVehicle))
    await db.execute(delete(ProjectTool))
    await db.execute(delete(Project))
    await db.execute(delete(Contract))
    await db.execute(delete(Certification))
    await db.execute(delete(CollaboratorEducation))
    await db.execute(delete(CollaboratorReview))
    await db.execute(delete(Tool))
    await db.execute(delete(User)) # Delete users
    
    # Break circular dependency Team <-> Collaborator
    # Team.leader_id -> Collaborator
    # Collaborator.team_id -> Team
    # Check if table exists first? Assume yes.
    try:
        await db.execute(update(Team).values(leader_id=None))
    except Exception:
        pass # Table might not exist or empty

    await db.execute(delete(Collaborator))
    await db.execute(delete(Team))
    await db.execute(delete(Fleet))
    await db.execute(delete(Insurance))
    await db.execute(delete(Client))
    await db.execute(delete(Role))
    
    await db.commit()
    print("✨ Dados limpos!")

async def seed_roles(db):
    """Cria os cargos padrão"""
    roles_data = [
        {
            "name": "Coordenador", 
            "description": "Coordenador de projetos", 
            "permissions": {
                "projects": ["read", "write"], 
                "contracts": ["read", "write"], 
                "finance": ["read", "write"],
                "collaborators": ["read", "write"],
                "fleet": ["read", "write"]
            }
        },
        {
            "name": "Analista", 
            "description": "Analista técnico", 
            "permissions": {
                "projects": ["read", "write"], 
                "contracts": ["read"], 
                "fleet": ["read"]
            }
        },
        {
            "name": "Técnico", 
            "description": "Técnico de campo", 
            "permissions": {
                "projects": ["read"], 
                "tickets": ["read", "write"]
            }
        },
        {"name": "Auxiliar", "description": "Auxiliar técnico", "permissions": {}},
        {"name": "Assistente", "description": "Assistente administrativo", "permissions": {"finance": ["read"], "collaborators": ["read"]}},
        {"name": "Supervisor", "description": "Supervisor de equipe", "permissions": {"projects": ["read"], "collaborators": ["read", "write"]}},
        {
            "name": "ADM", 
            "description": "Administrador Geral", 
            "permissions": {
                "projects": ["read", "write"], 
                "contracts": ["read", "write"], 
                "finance": ["read", "write"],
                "collaborators": ["read", "write"],
                "fleet": ["read", "write"],
                "tickets": ["read", "write"],
                "users": ["read", "write"],
                "roles": ["read", "write"]
            }
        },
    ]
    
    print("🔍 Criando cargos...")
    roles_map = {} # Map name -> id
    
    for role_data in roles_data:
        role = Role(**role_data)
        db.add(role)
        await db.flush()
        roles_map[role.name] = role.id
    
    print(f"✅ {len(roles_data)} cargos criados.")
    return roles_map

async def seed_clients(db):
    """Cria 10 clientes fictícios"""
    print("🔍 Criando clientes...")
    
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
        new_clients.append(client)
    
    await db.flush()
    print(f"✅ {len(new_clients)} clientes criados.")
    return new_clients

async def seed_insurances(db):
    """Cria 3 seguros fictícios"""
    print("🔍 Criando seguros...")
    
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
    
    await db.flush()
    print(f"✅ {len(created_insurances)} seguros criados.")
    return created_insurances

async def seed_fleet(db, insurances):
    """Cria 5 veículos fictícios"""
    print("🔍 Criando frota...")
    
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
    
    created_fleet = []
    for v_data in vehicles:
        v_data['odometer'] = 0
        vehicle = Fleet(**v_data)
        db.add(vehicle)
        await db.flush()
        created_fleet.append(vehicle)
    print(f"✅ {len(created_fleet)} veículos criados.")
    return created_fleet

async def seed_teams(db):
    """Cria times fictícios"""
    print("🔍 Criando times...")
    
    teams_data = [
        {"name": "Engenharia", "description": "Departamento de Engenharia e Projetos"},
        {"name": "Operações", "description": "Equipe de campo e instalações"},
        {"name": "Manutenção", "description": "Manutenção preventiva e corretiva"},
        {"name": "Administrativo", "description": "Suporte administrativo e financeiro"},
        {"name": "Vendas", "description": "Equipe comercial e novos negócios"},
        {"name": "TI", "description": "Tecnologia da Informação"},
    ]
    
    created_teams = []
    for t_data in teams_data:
        team = Team(**t_data)
        db.add(team)
        created_teams.append(team)
            
    await db.flush()
    print(f"✅ {len(created_teams)} times criados.")
    return created_teams

async def seed_collaborators(db, roles_map, teams):
    """Cria 30 colaboradores com certificações e times"""
    print("🔍 Criando 30 colaboradores...")
    
    first_names = ["Lucas", "Ana", "Pedro", "Maria", "João", "Julia", "Carlos", "Fernanda", "Rafael", "Bruna",
                   "Gabriel", "Larissa", "Mateus", "Camila", "Gustavo", "Amanda", "Felipe", "Renata", "Bruno", "Patricia",
                   "Thiago", "Vanessa", "Rodrigo", "Letícia", "Diego", "Bianca", "Leandro", "Monica", "Ricardo", "Tatiane"]
    last_names = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes",
                  "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes", "Soares", "Fernandes", "Vieira", "Barbosa",
                  "Rocha", "Dias", "Moreira", "Nascimento", "Cardoso", "Moura", "Teixeira", "Mendes", "Araujo", "Ramos"]
    
    roles_list = list(roles_map.keys())
    new_collabs = []
    
    print(f"   Gerando dados para {len(first_names)} pessoas...")

    for i in range(30):
        # Pick random name parts to ensure variety even if list is short
        fname = random.choice(first_names)
        lname = random.choice(last_names)
        # Avoid duplicates by simple mutation if needed, but random choice of 30 from 30x30 combo is safe.
        # Actually I provided 30 names in list. I'll just iterate or random.
        # Let's use index if i < len, else random.
        if i < len(first_names):
             name = f"{first_names[i]} {last_names[i]}"
        else:
             name = f"{random.choice(first_names)} {random.choice(last_names)}"
        
        # Determine Role and Team
        # Simple Logic:
        # Technical roles -> Operações/Manutenção
        # Office roles -> Presidência/Admin/Engenharia
        
        role_name = random.choice(roles_list)
        
        # Force Lucas Silva to be ADM
        if name == "Lucas Silva":
            role_name = "ADM"
            
        role_id = roles_map[role_name]
        
        team_choice = None
        
        if role_name in ["Técnico", "Auxiliar", "Supervisor"]:
            team_choice = random.choice([t for t in teams if t.name in ["Operações", "Manutenção"]])
        elif role_name in ["Analista", "Coordenador"]:
            team_choice = random.choice([t for t in teams if t.name in ["Engenharia", "TI", "Vendas", "Administrativo"]])
        else:
            team_choice = random.choice(teams)
            
        cpf_base = f"{random.randint(100, 999)}.{random.randint(100, 999)}.{random.randint(100, 999)}"
        cpf = f"{cpf_base}-{random.randint(10, 99)}"
        rg = f"{random.randint(10, 99)}.{random.randint(100, 999)}.{random.randint(100, 999)}-{random.randint(0, 9)}"
        
        # Email unique check (simple suffix)
        email = f"{name.lower().replace(' ', '.').replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u').replace('ã', 'a').replace('ç', 'c')}{random.randint(1,99) if i > 25 else ''}@centauro.com.br"
        
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
            salary=salary,
            team_id=team_choice.id,
            cnh_number=f"{random.randint(100000000, 999999999)}",
            cnh_category=random.choice(["A", "B", "AB", "C", "D", "E"]),
            cnh_validity=date.today() + timedelta(days=random.randint(100, 1000))
        )
        db.add(collab)
        new_collabs.append(collab)
    
    await db.flush()
    
    # Certifications (NR, ASO, Training)
    print("📜 Adicionando certificações...")
    cert_types = [CertificationType.NR, CertificationType.ASO, CertificationType.TRAINING]
    cert_names = {
        CertificationType.NR: ["NR-10", "NR-35", "NR-12", "NR-06"],
        CertificationType.ASO: ["ASO Admissional", "ASO Periódico", "ASO Mudança de Função"],
        CertificationType.TRAINING: ["Trabalho em Altura", "Primeiros Socorros", "Direção Defensiva", "Eletricidade Básica"]
    }
    
    for collab in new_collabs:
        # Add 1-3 certifications per collaborator
        num_certs = random.randint(1, 3)
        for _ in range(num_certs):
            c_type = random.choice(cert_types)
            c_name = random.choice(cert_names[c_type])
            validity = date.today() + timedelta(days=random.randint(-30, 730)) # Some expired, some valid
            
            cert = Certification(
                name=c_name,
                type=c_type,
                validity=validity,
                collaborator_id=collab.id
            )
            db.add(cert)
            
    print(f"✅ {len(new_collabs)} Colaboradores e certificações criados.")
    return new_collabs

async def seed_education(db, collaborators):
    """Cria dados de educação para os colaboradores"""
    print("🎓 Adicionando histórico escolar/acadêmico...")
    
    education_data = [
        {"type": EducationType.ACADEMIC, "course": "Engenharia Elétrica", "inst": "USP"},
        {"type": EducationType.ACADEMIC, "course": "Engenharia Civil", "inst": "Unicamp"},
        {"type": EducationType.TECHNICAL, "course": "Técnico em Eletrônica", "inst": "ETEC"},
        {"type": EducationType.TECHNICAL, "course": "Eletrotécnica", "inst": "SENAI"},
        {"type": EducationType.CERTIFICATION, "course": "Gestão de Projetos", "inst": "FGV"},
    ]

    count = 0
    for collab in collaborators:
        # Add 1-2 items per person
        num = random.randint(1, 2)
        for _ in range(num):
            item = random.choice(education_data)
            
            edu = CollaboratorEducation(
                collaborator_id=collab.id,
                type=item["type"],
                course_name=item["course"],
                institution=item["inst"],
                conclusion_date=date.today() - timedelta(days=random.randint(100, 2000)),
                attachment_url=None
            )
            db.add(edu)
            count += 1
            
    await db.flush()
    print(f"✅ {count} registros de educação criados.")

async def seed_leaders(db, teams):
    """Define líderes para os times"""
    print("👑 Definindo líderes de equipe...")
    
    # Refresh teams to ensure we have access or queries work?
    # Actually teams objects are attached to session.
    
    for team in teams:
        # Find collaborators in this team
        stmt = select(Collaborator).filter(Collaborator.team_id == team.id)
        result = await db.execute(stmt)
        members = result.scalars().all()
        
        if members:
            # Pick a "Coordenador" or "Supervisor" if possible, else random
            leaders = [m for m in members if m.role in ["Coordenador", "Supervisor"]]
            if leaders:
                leader = random.choice(leaders)
            else:
                leader = random.choice(members)
            
            # Update team
            # We must use proper update or attribute set
            team.leader_id = leader.id
            db.add(team) # Mark as modified
    
    await db.flush()
    print("✅ Líderes definidos.")
async def seed_tools(db):
    """Cria 5 ferramentas"""
    print("🔍 Criando 5 ferramentas...")
    
    tools_data = [
        {"name": "Furadeira de Impacto", "serial_number": "FUR-001", "current_holder": "Almoxarifado", "current_location": "Almoxarifado", "status": ToolStatus.AVAILABLE},
        {"name": "Parafusadeira", "serial_number": "PAR-002", "current_holder": "João Silva", "current_location": "Projeto Vinculado 1", "status": ToolStatus.IN_USE},
        {"name": "Multímetro Digital", "serial_number": "MUL-003", "current_holder": "Maria Santos", "current_location": "Projeto Vinculado 2", "status": ToolStatus.IN_USE},
        {"name": "Alicate Amperímetro", "serial_number": "ALI-004", "current_holder": "Almoxarifado", "current_location": "Almoxarifado", "status": ToolStatus.MAINTENANCE},
        {"name": "Jogo de Chaves", "serial_number": "JOG-005", "current_holder": "Almoxarifado", "current_location": "Escritório", "status": ToolStatus.AVAILABLE},
    ]
    
    for tool_data in tools_data:
        tool = Tool(**tool_data)
        db.add(tool)
    
    await db.flush()
    print("✅ Ferramentas criadas.")

async def seed_contracts(db, clients):
    """Cria 5 contratos com TAG logic e novos campos"""
    print("🔍 Criando 5 contratos...")
    
    created_contracts = []
    # Use first 5 clients
    selected_clients = clients[:5]
    
    yy = date.today().strftime("%y")
    mm = date.today().strftime("%m")
    
    descriptions = [
        "Manutenção Elétrica Industrial",
        "Consultoria de Eficiência Energética",
        "Instalação de Painéis Solares",
        "Adequação NR-10",
        "Projeto de Automação Predial"
    ]
    
    cel_count = 0
    cec_count = 0
    
    for i, client in enumerate(selected_clients):
        client_num = client.client_number
        
        contract_type = "RECORRENTE" if i % 2 != 0 else "LPU"
        
        if contract_type == "LPU":
            prefix = "CEL"
            cel_count += 1
            seq = f"{cel_count:02d}"
        else:
            prefix = "CEC"
            cec_count += 1
            seq = f"{cec_count:02d}"
        
        tag = f"{prefix}_{yy}{mm}_{seq}_{client_num}"
        
        # Date logic
        if i in [2, 3]: # Vencidos
            signature_date = date.today() - timedelta(days=400)
            end_date = date.today() - timedelta(days=30) # Expired 30 days ago
        else: # Ativos
            signature_date = date.today() - timedelta(days=random.randint(10, 100))
            end_date = date.today() + timedelta(days=random.randint(200, 700))
            
        # Financials
        value = None
        monthly_value = None
        due_day = None
        readjustment_index = None
        
        if contract_type == "LPU":
            value = random.randint(50000, 500000)
        else:
            monthly_value = random.randint(2000, 15000)
            due_day = random.randint(1, 28)
            readjustment_index = "IPCA"
        
        contract = Contract(
            client_id=client.id,
            description=descriptions[i],
            contract_number=tag,
            signature_date=signature_date,
            end_date=end_date,
            contract_type=contract_type,
            value=value,
            monthly_value=monthly_value,
            due_day=due_day,
            readjustment_index=readjustment_index
        )
        db.add(contract)
        created_contracts.append(contract)
    
    await db.flush()
    print("✅ Contratos criados.")
    return created_contracts

async def seed_projects(db, clients, contracts):
    """Cria 10 projetos (2 avulsos, 8 vinculados)"""
    print("🔍 Criando 10 projetos...")
    
    created_projects = []
    yy = date.today().strftime("%y")
    mm = date.today().strftime("%m")
    
    # 1. Standalone Projects (2)
    print("   Creating 2 Standalone Projects...")
    for i in range(2):
        client = clients[i] # Use first 2 clients
        seq = f"{i+1:02d}"
        client_num = client.client_number
        tag = f"CEP_{yy}{mm}_{seq}_{client_num}"
        
        # Project 2 will be expired
        if i == 1:
            start_date = date.today() - timedelta(days=200)
            end_date = date.today() - timedelta(days=10) # Expired
        else:
            start_date = date.today()
            end_date = date.today() + timedelta(days=180)
        
        project = Project(
            name=f"Projeto Avulso {i+1}",
            tag=tag,
            project_number=i+1,
            client_id=client.id,
            coordinator="Coordenador Geral",
            scope="Escopo do projeto avulso...",
            start_date=start_date,
            end_date=end_date,
            status="Em Andamento", # Will be auto-finalized if expired
            service_value=random.randint(10000, 50000),
            material_value=random.randint(1000, 5000),
            budget=random.randint(15000, 60000)
        )
        db.add(project)
        created_projects.append(project)
        
    # 2. Linked Projects (8)
    print("   Creating 8 Linked Projects...")
    # Distribute 8 projects among 5 contracts
    distribution = [2, 2, 2, 1, 1]
    
    proj_count = 0
    for i, count in enumerate(distribution):
        contract = contracts[i]
        for j in range(count):
            proj_count += 1
            seq = f"{j+1:02d}"
            tag = f"{contract.contract_number}_P{seq}"
            
            # Inherit dates from contract roughly, but some expired
            if contract.end_date < date.today():
                # Contract expired, project likely expired too
                start_date = contract.signature_date + timedelta(days=10)
                end_date = contract.end_date - timedelta(days=5)
            else:
                start_date = date.today()
                end_date = date.today() + timedelta(days=120)
            
            project = Project(
                name=f"Projeto Vinculado {proj_count}",
                tag=tag,
                project_number=proj_count,
                client_id=contract.client_id,
                contract_id=contract.id,
                coordinator="Coordenador de Contrato",
                scope=f"Escopo do projeto vinculado ao contrato {contract.contract_number}...",
                start_date=start_date,
                end_date=end_date,
                status="Em Andamento",
                service_value=random.randint(10000, 50000),
                material_value=random.randint(1000, 5000),
                budget=random.randint(15000, 60000)
            )
            db.add(project)
            created_projects.append(project)
            
    await db.flush()
    print("✅ Projetos criados.")
    return created_projects

async def seed_tickets(db, contracts, collaborators):
    """Cria 4 tickets"""
    print("🔍 Criando 4 tickets...")
    
    tickets_data = [
        {"title": "Falha no ar condicionado", "priority": TicketPriority.HIGH, "status": TicketStatus.OPEN},
        {"title": "Lâmpada queimada sala de reunião", "priority": TicketPriority.LOW, "status": TicketStatus.RESOLVED},
        {"title": "Vazamento no banheiro", "priority": TicketPriority.MEDIUM, "status": TicketStatus.IN_PROGRESS},
        {"title": "Porta emperrada", "priority": TicketPriority.LOW, "status": TicketStatus.OPEN},
    ]
    
    for i, data in enumerate(tickets_data):
        ticket = Ticket(
            **data,
            contract_id=contracts[i % len(contracts)].id,
            responsible_id=collaborators[i % len(collaborators)].id
        )
        db.add(ticket)
        
    await db.flush()
    print("✅ Tickets criados.")

async def seed_purchases(db, projects):
    """Cria solicitações de compra vinculadas a projetos"""
    print("🔍 Criando solicitações de compra...")
    
    for i, project in enumerate(projects[:5]): # Add purchases to first 5 projects
        request = PurchaseRequest(
            project_id=project.id,
            description=f"Materiais para {project.name}",
            requester="Engenheiro Responsável",
            status="pending"
        )
        db.add(request)
        await db.flush()
        
        # Add items
        items = [
            {"description": "Cabo 2.5mm", "quantity": 100, "unit": "m", "unit_price": 2.50},
            {"description": "Disjuntor 16A", "quantity": 10, "unit": "un", "unit_price": 15.00},
            {"description": "Fita Isolante", "quantity": 5, "unit": "un", "unit_price": 5.00}
        ]
        
        for item_data in items:
            item = PurchaseItem(
                request_id=request.id,
                **item_data,
                total_price=item_data["quantity"] * item_data["unit_price"]
            )
            db.add(item)
            
    await db.flush()
    await db.flush()
    print("✅ Solicitações de compra criadas.")

async def seed_billings(db, projects):
    """Cria faturamentos com diversos status"""
    print("🔍 Criando faturamentos (Contas a Receber)...")
    
    from app.models.commercial import BillingStatus
    
    created_billings = []
    
    for i, project in enumerate(projects):
        # Create 3-5 billings per project
        num_billings = random.randint(3, 5)
        
        for j in range(num_billings):
            value = random.randint(1000, 10000)
            description = f"Medição {j+1} - {project.name}"
            
            # Determine status based on random choice or logic
            status_choice = random.choice(list(BillingStatus))
            
            # Initialize fields
            date_due = None
            issue_date = None
            payment_date = None
            invoice_number = None
            replaced_by_id = None
            
            today = date.today()
            
            if status_choice == BillingStatus.PREVISTO:
                # No dates required
                pass
                
            elif status_choice == BillingStatus.EMITIDA:
                # Future due date
                issue_date = today - timedelta(days=random.randint(1, 10))
                date_due = today + timedelta(days=random.randint(10, 30))
                invoice_number = f"{random.randint(1000, 9999)}"
                
            elif status_choice == BillingStatus.PAGO:
                # Past dates
                issue_date = today - timedelta(days=random.randint(30, 60))
                date_due = issue_date + timedelta(days=15)
                payment_date = date_due - timedelta(days=random.randint(0, 5)) # Paid on time or early
                invoice_number = f"{random.randint(1000, 9999)}"
                
            elif status_choice == BillingStatus.VENCIDA:
                # Past due date, no payment
                issue_date = today - timedelta(days=random.randint(40, 70))
                date_due = today - timedelta(days=random.randint(1, 20)) # Overdue
                invoice_number = f"{random.randint(1000, 9999)}"
                
            elif status_choice == BillingStatus.CANCELADA:
                # Can have dates or not
                issue_date = today - timedelta(days=random.randint(10, 20))
                invoice_number = f"{random.randint(1000, 9999)}"
                
            elif status_choice == BillingStatus.SUBSTITUIDA:
                # Needs a replacement. We'll handle this by creating a replacement first?
                # Or just skip for now and handle manually if needed.
                # Let's simplify: Create a "PAGO" billing and say this one was replaced by it.
                # But we need the ID.
                # Strategy: Create this as PREVISTO first, then update later?
                # Or just skip SUBSTITUIDA in this random loop and do a specific case.
                status_choice = BillingStatus.PREVISTO # Fallback
            
            billing = ProjectBilling(
                project_id=project.id,
                value=value,
                description=description,
                status=status_choice,
                date=date_due,
                issue_date=issue_date,
                payment_date=payment_date,
                invoice_number=invoice_number,
                replaced_by_id=replaced_by_id
            )
            db.add(billing)
            created_billings.append(billing)
            
    await db.flush()
    
    # Specific Case: Substitution
    # Create a billing that is SUBSTITUIDA and one that replaces it (EMITIDA)
    if len(projects) > 0:
        p = projects[0]
        
        # Replacement
        replacement = ProjectBilling(
            project_id=p.id,
            value=5000,
            description="Medição Corrigida",
            status=BillingStatus.EMITIDA,
            date=date.today() + timedelta(days=15),
            issue_date=date.today(),
            invoice_number="9999"
        )
        db.add(replacement)
        await db.flush()
        
        # Original (Substituted)
        original = ProjectBilling(
            project_id=p.id,
            value=5000,
            description="Medição Incorreta",
            status=BillingStatus.SUBSTITUIDA,
            date=date.today() + timedelta(days=15),
            issue_date=date.today(),
            invoice_number="9998",
            replaced_by_id=replacement.id
        )
        db.add(original)
        await db.flush()
        
    print(f"✅ {len(created_billings) + 2} faturamentos criados.")

async def seed_allocations(db, collaborators, fleet, projects):
    """Cria alocações de recursos em projetos e vincula às tabelas de recursos do projeto"""
    print("🔍 Criando alocações e vinculando recursos...")
    
    today = date.today()
    created_allocations = []
    
    # 1. Allocate Collaborators
    # Allocate first 10 collaborators to different projects for a range of dates
    print("   Allocating 10 collaborators...")
    for i, collab in enumerate(collaborators[:10]):
        proj = projects[i % len(projects)]
        
        # Define range (start today, some duration)
        start_date = today + timedelta(days=random.randint(0, 5))
        duration = random.randint(5, 15)
        end_date = start_date + timedelta(days=duration)
        
        # Create ProjectCollaborator link
        proj_collab = ProjectCollaborator(
            project_id=proj.id,
            collaborator_id=collab.id,
            role=collab.role, # Use their main role as project role
            start_date=start_date,
            end_date=end_date,
            status="active"
        )
        db.add(proj_collab)
        
        # Create Daily Allocations for this range
        current_date = start_date
        while current_date <= end_date:
            # Skip Sundays if you want, but for simplicity let's book all
            if current_date.weekday() != 6: # Skip Sunday
                alloc = Allocation(
                    date=current_date,
                    resource_type=ResourceType.PERSON,
                    resource_id=collab.id,
                    project_id=proj.id,
                    description=f"Alocado no projeto {proj.name}",
                    type=AllocationType.RESERVATION
                )
                db.add(alloc)
                created_allocations.append(alloc)
            
            current_date += timedelta(days=1)
            
    # 2. Allocate Vehicles
    # Allocate first 5 vehicles to projects
    print("   Allocating 5 vehicles...")
    for i, vehicle in enumerate(fleet[:5]):
        proj = projects[(i+3) % len(projects)] # Offset project choice
        
        start_date = today + timedelta(days=random.randint(0, 2))
        duration = random.randint(7, 20)
        end_date = start_date + timedelta(days=duration)
        
        # Create ProjectVehicle link
        proj_vehicle = ProjectVehicle(
            project_id=proj.id,
            vehicle_id=vehicle.id,
            start_date=start_date,
            end_date=end_date
        )
        db.add(proj_vehicle)
        
        # Create Daily Allocations
        current_date = start_date
        while current_date <= end_date:
            if current_date.weekday() != 6: # Skip Sunday
                alloc = Allocation(
                    date=current_date,
                    resource_type=ResourceType.CAR,
                    resource_id=vehicle.id,
                    project_id=proj.id,
                    description=f"Veículo alocado para {proj.name}",
                    type=AllocationType.RESERVATION
                )
                db.add(alloc)
                created_allocations.append(alloc)
            
            current_date += timedelta(days=1)
    
    await db.flush()
    print(f"✅ Recursos vinculados e {len(created_allocations)} alocações diárias criadas.")

async def seed_users(db):
    print("🔍 Seeding Users...")
    admin_email = "admin@centauro.com"
    # Async query style
    stmt = select(User).filter(User.email == admin_email)
    result = await db.execute(stmt)
    existing_admin = result.scalars().first()
    
    if not existing_admin:
        hashed_password = get_password_hash("senha123")
        admin = User(
            email=admin_email,
            password_hash=hashed_password,
            role=UserRole.ADMIN,
            is_superuser=True
        )
        db.add(admin)
        await db.flush()
        print(f"✅ Admin user created: {admin_email} / senha123")
    else:
        print("ℹ️ Admin user already exists.")

    # Create User for Lucas Silva (Collaborator)
    lucas_email = "lucas.silva@centauro.com.br"
    stmt = select(User).filter(User.email == lucas_email)
    result = await db.execute(stmt)
    existing_lucas = result.scalars().first()

    if not existing_lucas:
        # Find the collaborator
        stmt_collab = select(Collaborator).filter(Collaborator.name == "Lucas Silva")
        result_collab = await db.execute(stmt_collab)
        lucas_collab = result_collab.scalars().first()

        if lucas_collab:
            hashed_password = get_password_hash("senha123")
            # Determine role based on collaborator's role? Or just set default.
            # The permissions come from the collaborator linkage.
            lucas_user = User(
                email=lucas_email,
                password_hash=hashed_password,
                role=UserRole.ADMIN,
                is_superuser=False,
                collaborator_id=lucas_collab.id
            )
            db.add(lucas_user)
            await db.flush()
            print(f"✅ User created for Lucas Silva: {lucas_email} / senha123")
        else:
            print("⚠️ Author Lucas Silva not found (unexpected).")
    else:
        print(f"ℹ️ User {lucas_email} already exists.")
        
    # Return list of users for other seeds
    stmt_all = select(User)
    result_all = await db.execute(stmt_all)
    all_users = result_all.scalars().all()
    return all_users

async def seed_reviews(db, collaborators, users):
    """Cria avaliações de desempenho"""
    print("⭐ Criando avaliações de desempenho...")
    
    if not users:
        print("⚠️ Sem usuários para criar avaliações.")
        return

    count = 0
    for collab in collaborators:
        # 1-3 reviews per collab
        for _ in range(random.randint(1, 3)):
            reviewer = random.choice(users)
            review_date = date.today() - timedelta(days=random.randint(10, 365))
            
            review = CollaboratorReview(
                collaborator_id=collab.id,
                reviewer_id=reviewer.id,
                date=review_date,
                score_technical=random.randint(3, 5), # Mostly good
                score_safety=random.randint(4, 5),
                score_punctuality=random.randint(2, 5),
                comments=random.choice([
                    "Excelente desempenho técnico.",
                    "Precisa melhorar pontualidade.",
                    "Líder nato, muito proativo.",
                    "Segue rigorosamente as normas de segurança.",
                    "Entrega resultados consistentes."
                ])
            )
            db.add(review)
            count += 1
            
    await db.flush()
    print(f"✅ {count} avaliações criadas.")

async def seed_feedbacks(db, projects, users):
    """Cria feedbacks (diário de obra) nos projetos"""
    print("📝 Criando diário de projetos (feedbacks)...")
    
    if not users:
        print("⚠️ Sem usuários para criar feedbacks.")
        return

    count = 0
    for project in projects:
        # 3-8 feedbacks per project
        for i in range(random.randint(3, 8)):
            author = random.choice(users)
            fb_date = project.start_date + timedelta(days=random.randint(0, 30))
            if fb_date > datetime.now().date():
                 fb_date = datetime.now().date() # Cap at today
            
            # Convert date to datetime for created_at
            fb_datetime = datetime(fb_date.year, fb_date.month, fb_date.day, random.randint(8, 18), random.randint(0, 59))
            
            fb_type = random.choice(list(FeedbackType))
            
            msg = f"Registro diário: {random.choice(['Equipe mobilizada.', 'Chuva intensa paralisou atividades.', 'Entrega de materiais realizada.', 'Visita do cliente.', 'Finalizada etapa de infraestrutura.'])}"
            
            feedback = ProjectFeedback(
                project_id=project.id,
                author_id=author.id,
                message=msg,
                created_at=fb_datetime,
                type=fb_type
            )
            db.add(feedback)
            count += 1
            
    await db.flush()
    print(f"✅ {count} feedbacks de projeto criados.")

async def main():
    print("🌱 Iniciando seed de dados (REFAZENDO TUDO)...")
    try:
        async with AsyncSessionLocal() as db:
            # Create tables if they don't exist (important for new User table)
            from app.database import engine
            from app.database import Base
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)

            await clear_data(db)
            
            roles_map = await seed_roles(db)
            clients = await seed_clients(db)
            insurances = await seed_insurances(db)
            fleet = await seed_fleet(db, insurances)
            
            teams = await seed_teams(db)
            collaborators = await seed_collaborators(db, roles_map, teams)
            await seed_leaders(db, teams)
            await seed_tools(db)
            
            await seed_education(db, collaborators)
            
            # Users must be created before Reviews and Feedbacks
            users = await seed_users(db) 
            
            await seed_reviews(db, collaborators, users)
            
            contracts = await seed_contracts(db, clients)
            projects = await seed_projects(db, clients, contracts)
            
            await seed_feedbacks(db, projects, users)
            
            await seed_tickets(db, contracts, collaborators)
            await seed_purchases(db, projects)
            await seed_billings(db, projects)
            await seed_allocations(db, collaborators, fleet, projects)
            
            # await seed_users(db) # Moved up
            
            await db.commit()
            print("✨ Seed concluído com sucesso!")
            
    except Exception as e:
        print(f"❌ Erro ao popular banco de dados: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
