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
from app.models.collaborator_teams import collaborator_teams
from app.models.operational import Collaborator, Certification, CertificationType, Allocation, ResourceType, AllocationType, CollaboratorEducation, EducationType, CollaboratorReview
from app.models.commercial import Client, Contract, Project, ProjectFeedback, FeedbackType
from app.models.finance import ProjectBilling, BillingStatus
from app.models.finance_payroll import MonthlyLaborCost, ProjectLaborCost
from app.models.project_resources import ProjectCollaborator, ProjectVehicle, ProjectTool
from app.models.assets import Fleet, FuelType, Insurance, Tool, ToolStatus, ToolCategory, ToolCondition, FleetStatus, VehicleMaintenance, VehicleFuelCost, VehicleTollCost
from app.models.tickets import Ticket, TicketStatus, TicketPriority
from app.models.purchases import PurchaseRequest, PurchaseItem
from app.models.proposals import CommercialProposal, ProposalTask
from app.models.client_contacts import ClientContact
from app.models.users import User, UserRole
from app.auth import get_password_hash
from sqlalchemy import select, delete, update

async def clear_data(db):
    """Limpa todos os dados do banco para um seed limpo"""
    print("🧹 Limpando dados existentes...")
    
    # Ordem importa devido a Foreign Keys
    await db.execute(delete(ProjectLaborCost))
    await db.execute(delete(MonthlyLaborCost))
    await db.execute(delete(VehicleMaintenance))
    await db.execute(delete(VehicleFuelCost))
    await db.execute(delete(VehicleTollCost))
    await db.execute(delete(ProposalTask))
    await db.execute(delete(CommercialProposal))
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

    # Clear N:N junction table
    try:
        await db.execute(delete(collaborator_teams))
    except Exception:
        pass

    # await db.execute(delete(Collaborator)) # Preservado para manter os dados vindos do Excel
    await db.execute(delete(Team))
    await db.execute(delete(ClientContact)) # Delete client contacts
    await db.execute(delete(Fleet))
    await db.execute(delete(Insurance))
    # await db.execute(delete(Client)) # Ignorado para preservar importações do Excel
    await db.execute(delete(Role))
    
    await db.commit()
    print("✨ Dados limpos! (Mantendo a tabela Clientes)")

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
    """Obtém clientes do banco (usando os dados reais inseridos)"""
    print("🔍 Obtendo clientes...")
    
    from sqlalchemy import select
    from app.models.commercial import Client
    
    result = await db.execute(select(Client))
    existing_clients = result.scalars().all()
    
    if len(existing_clients) > 0:
        print(f"✅ Encontrados {len(existing_clients)} clientes no banco. Ignorando criação de fictícios.")
        return existing_clients
        
    print("⚠️ Nenhum cliente encontrado. Por favor, execute o script seed_clients.py com a planilha Excel primeiro.")
    return []

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
    """Cria frota real baseada na planilha de consumo"""
    print("🔍 Criando frota...")
    
    vehicles = [
        # FIAT Vehicles
        {"license_plate": "LLV7582", "model": "STRADA WORKING", "brand": "FIAT", "year": 2013, 
         "fuel_type": FuelType.GASOLINA, "status": FleetStatus.ACTIVE, "color": "Branco",
         "cnpj": "61.198.164/0001-60", "insurance_id": insurances[0].id if insurances else None},
        {"license_plate": "LQS5041", "model": "UNO MILLE", "brand": "FIAT", "year": 2013, 
         "fuel_type": FuelType.GASOLINA, "status": FleetStatus.ACTIVE, "color": "Prata",
         "cnpj": "61.198.164/0001-60", "insurance_id": insurances[0].id if insurances else None},
        {"license_plate": "KQW4792", "model": "PALIO", "brand": "FIAT", "year": 2015, 
         "fuel_type": FuelType.GASOLINA, "status": FleetStatus.ACTIVE, "color": "Branco",
         "cnpj": "61.198.164/0001-60", "insurance_id": insurances[0].id if insurances else None},
        {"license_plate": "KOE4256", "model": "UNO", "brand": "FIAT", "year": 2007, 
         "fuel_type": FuelType.GASOLINA, "status": FleetStatus.ACTIVE, "color": "Prata",
         "cnpj": "61.198.164/0001-60", "insurance_id": insurances[0].id if insurances else None},
        {"license_plate": "PUC3186", "model": "UNO", "brand": "FIAT", "year": 2014, 
         "fuel_type": FuelType.GASOLINA, "status": FleetStatus.ACTIVE, "color": "Branco",
         "cnpj": "61.198.164/0001-60", "insurance_id": insurances[0].id if insurances else None},
        {"license_plate": "GCK9D18", "model": "WEEKEND", "brand": "FIAT", "year": 2016, 
         "fuel_type": FuelType.GASOLINA, "status": FleetStatus.ACTIVE, "color": "Prata",
         "cnpj": "61.198.164/0001-60", "insurance_id": insurances[0].id if insurances else None},
        {"license_plate": "LUC4F47", "model": "FASTBACK/TURBO", "brand": "FIAT", "year": 2023, 
         "fuel_type": FuelType.GASOLINA, "status": FleetStatus.ACTIVE, "color": "Preto",
         "cnpj": "61.198.164/0001-60", "insurance_id": insurances[0].id if insurances else None},
        {"license_plate": "RTG4I96", "model": "STRADA", "brand": "FIAT", "year": 2022, 
         "fuel_type": FuelType.GASOLINA, "status": FleetStatus.ACTIVE, "color": "Vermelho",
         "cnpj": "61.198.164/0001-60", "insurance_id": insurances[0].id if insurances else None},
        {"license_plate": "TOJ0A44", "model": "ARGO", "brand": "FIAT", "year": 2025, 
         "fuel_type": FuelType.GASOLINA, "status": FleetStatus.ACTIVE, "color": "Branco",
         "cnpj": "61.198.164/0001-60", "insurance_id": insurances[0].id if insurances else None},
        {"license_plate": "TOJ0A40", "model": "ARGO", "brand": "FIAT", "year": 2025, 
         "fuel_type": FuelType.GASOLINA, "status": FleetStatus.ACTIVE, "color": "Prata",
         "cnpj": "61.198.164/0001-60", "insurance_id": insurances[0].id if insurances else None},
        {"license_plate": "TOJ0A45", "model": "ARGO", "brand": "FIAT", "year": 2025, 
         "fuel_type": FuelType.GASOLINA, "status": FleetStatus.ACTIVE, "color": "Azul",
         "cnpj": "61.198.164/0001-60", "insurance_id": insurances[0].id if insurances else None},
        {"license_plate": "TOL4D70", "model": "STRADA", "brand": "FIAT", "year": 2026, 
         "fuel_type": FuelType.GASOLINA, "status": FleetStatus.ACTIVE, "color": "Branco",
         "cnpj": "61.198.164/0001-60", "insurance_id": insurances[0].id if insurances else None},
        {"license_plate": "TOL4D72", "model": "STRADA", "brand": "FIAT", "year": 2026, 
         "fuel_type": FuelType.GASOLINA, "status": FleetStatus.ACTIVE, "color": "Prata",
         "cnpj": "61.198.164/0001-60", "insurance_id": insurances[0].id if insurances else None},

        # RENAULT Vehicles
        {"license_plate": "RQR3J33", "model": "OROCH/EXP", "brand": "RENAULT", "year": 2022, 
         "fuel_type": FuelType.GASOLINA, "status": FleetStatus.ACTIVE, "color": "Branco",
         "cnpj": "33.448.150/0001-11", "insurance_id": insurances[1].id if len(insurances) > 1 else None},
        {"license_plate": "RQR3J79", "model": "OROCH/EXP", "brand": "RENAULT", "year": 2022, 
         "fuel_type": FuelType.GASOLINA, "status": FleetStatus.ACTIVE, "color": "Prata",
         "cnpj": "33.448.150/0001-11", "insurance_id": insurances[1].id if len(insurances) > 1 else None},
        {"license_plate": "QXL0J20", "model": "KWID", "brand": "RENAULT", "year": 2021, 
         "fuel_type": FuelType.GASOLINA, "status": FleetStatus.ACTIVE, "color": "Vermelho",
         "cnpj": "33.448.150/0001-11", "insurance_id": insurances[1].id if len(insurances) > 1 else None},
        {"license_plate": "NAX6H44", "model": "KWID", "brand": "RENAULT", "year": 2023, 
         "fuel_type": FuelType.GASOLINA, "status": FleetStatus.ACTIVE, "color": "Branco",
         "cnpj": "33.448.150/0001-11", "insurance_id": insurances[1].id if len(insurances) > 1 else None},
        # VW
        {"license_plate": "KWW2751", "model": "CROSSFOX", "brand": "VW", "year": 2010, 
         "fuel_type": FuelType.GASOLINA, "status": FleetStatus.ACTIVE, "color": "Prata",
         "cnpj": "33.164.021/0001-00", "insurance_id": insurances[2].id if len(insurances) > 2 else None},
        # CHEVROLET Diesel
        {"license_plate": "KZP9I09", "model": "S10", "brand": "CHEVROLET", "year": 2019, 
         "fuel_type": FuelType.DIESEL, "status": FleetStatus.ACTIVE, "color": "Branco",
         "cnpj": "61.074.175/0001-38", "insurance_id": insurances[0].id if insurances else None},
        # MITSUBISHI Diesel
        {"license_plate": "RMR6D75", "model": "L200", "brand": "MITSUBISHI", "year": 2022, 
         "fuel_type": FuelType.DIESEL, "status": FleetStatus.ACTIVE, "color": "Prata",
         "cnpj": "61.074.175/0001-38", "insurance_id": insurances[0].id if insurances else None},
        # TOYOTA Diesel
        {"license_plate": "RMS4F05", "model": "HILUX", "brand": "TOYOTA", "year": 2021, 
         "fuel_type": FuelType.DIESEL, "status": FleetStatus.ACTIVE, "color": "Branco",
         "cnpj": "61.573.796/0001-66", "insurance_id": insurances[1].id if len(insurances) > 1 else None},
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
    """Cria times específicos solicitados com seus devidos líderes"""
    print("🔍 Criando times solicitados...")
    
    teams_def = [
        {"name": "Hugo", "leader_name": "Hugo Aquino", "desc": "Equipe Hugo"},
        {"name": "Fabiano", "leader_name": "Fabiano Machado", "desc": "Equipe Fabiano"},
        {"name": "Vale ES", "leader_name": "Rui", "desc": "Equipe Vale ES"},
        {"name": "Vale RJ", "leader_name": "Rui", "desc": "Equipe Vale RJ"},
        {"name": "Vale MA", "leader_name": "Rui", "desc": "Equipe Vale MA"},
        {"name": "Globo", "leader_name": "Robson Ferreira", "desc": "Equipe Globo"},
        {"name": "Projetos", "leader_name": "Lucas Pereira", "desc": "Projetos"},
        {"name": "TI", "leader_name": "Lucas Pereira", "desc": "Tecnologia da Informação"},
        {"name": "DP & RH", "leader_name": "Mayara", "desc": "Departamento Pessoal e RH"},
        {"name": "Financeiro", "leader_name": "Lucas Pereira", "desc": "Financeiro"},
        {"name": "Comercial", "leader_name": "Yan Lopes", "desc": "Comercial"},
        {"name": "Manutenção", "leader_name": "Raphael Santoro", "desc": "Manutenção"},
        {"name": "MP RJ", "leader_name": "Carlos Eduardo Silva", "desc": "MP RJ"}
    ]
    
    created_teams = []
    
    for t_def in teams_def:
        # Procurar o líder no banco
        stmt = select(Collaborator).filter(Collaborator.name.ilike(f"%{t_def['leader_name']}%"))
        res = await db.execute(stmt)
        leader = res.scalars().first()
        
        team = Team(
            name=t_def['name'],
            description=t_def['desc'],
            leader_id=leader.id if leader else None
        )
        db.add(team)
        created_teams.append(team)
            
    await db.flush()
    print(f"✅ {len(created_teams)} times criados.")
    return created_teams

async def seed_collaborators(db, roles_map, teams):
    """Atualiza colaboradores com times/roles e cria certificações fictícias"""
    print("🔍 Atualizando colaboradores reais e criando certificações...")
    
    result = await db.execute(select(Collaborator))
    existing_collabs = result.scalars().all()
    
    if len(existing_collabs) == 0:
        print("⚠️ Nenhum colaborador encontrado. Você deve rodar o seed_equipe.py primeiro.")
        return []
        
    roles_list = list(roles_map.keys())
    
    for collab in existing_collabs:
        matched_role_id = None
        if collab.role:
            for r_name, r_id in roles_map.items():
                if r_name.lower() in collab.role.lower() or collab.role.lower() in r_name.lower():
                    matched_role_id = r_id
                    break
        
        if not matched_role_id:
             matched_role_id = roles_map[random.choice(roles_list)]
             
        collab.role_id = matched_role_id
        
        role_str = (collab.role or "").lower()
        if "técnico" in role_str or "manutenção" in role_str or "auxiliar" in role_str or "supervisor" in role_str:
            ops_teams = [t for t in teams if t.name in ["Hugo", "Fabiano", "Vale ES", "Vale RJ", "Vale MA", "Globo", "Manutenção", "MP RJ"]]
            team_choice = random.choice(ops_teams) if ops_teams else random.choice(teams)
        elif "analista" in role_str or "coordenador" in role_str or "engenharia" in role_str or "projetos" in role_str:
            office_teams = [t for t in teams if t.name in ["Projetos", "TI", "DP & RH", "Financeiro", "Comercial"]]
            team_choice = random.choice(office_teams) if office_teams else random.choice(teams)
        else:
            team_choice = random.choice(teams)
            
        await db.execute(
            collaborator_teams.insert().values(collaborator_id=collab.id, team_id=team_choice.id)
        )
        db.add(collab)
        
    await db.flush()
    
    # Certifications (NR, ASO, Training)
    print("📜 Adicionando certificações...")
    cert_types = [CertificationType.NR, CertificationType.ASO, CertificationType.TRAINING]
    cert_names = {
        CertificationType.NR: ["NR-10", "NR-35", "NR-12", "NR-06"],
        CertificationType.ASO: ["ASO Admissional", "ASO Periódico", "ASO Mudança de Função"],
        CertificationType.TRAINING: ["Trabalho em Altura", "Primeiros Socorros", "Direção Defensiva", "Eletricidade Básica"]
    }
    
    for collab in existing_collabs:
        num_certs = random.randint(1, 3)
        for _ in range(num_certs):
            c_type = random.choice(cert_types)
            c_name = random.choice(cert_names[c_type])
            validity = date.today() + timedelta(days=random.randint(-30, 730))
            
            cert = Certification(
                name=c_name,
                type=c_type,
                validity=validity,
                collaborator_id=collab.id
            )
            db.add(cert)
            
    print(f"✅ {len(existing_collabs)} Colaboradores atualizados e certificações criadas.")
    return existing_collabs

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
    """(Obsoleto - Os líderes já foram associados na criação do time, essa função fará nada)"""
    print("👑 Líderes de equipe já foram definidos na criação dos times.")
    pass
async def seed_tools(db):
    """Cria 5 ferramentas"""
    print("🔍 Criando 5 ferramentas...")
    
    tools_data = [
        {
            "name": "Furadeira de Impacto Bosch", 
            "serial_number": "FUR-001", 
            "category": ToolCategory.POWER_TOOL,
            "condition": ToolCondition.GOOD,
            "current_holder": "Almoxarifado", 
            "current_location": "Almoxarifado", 
            "status": ToolStatus.AVAILABLE,
            "next_maintenance": None
        },
        {
            "name": "Máquina de Fusão Fujikura", 
            "serial_number": "FUS-88S", 
            "category": ToolCategory.INSTRUMENT,
            "condition": ToolCondition.GOOD,
            "current_holder": "João Silva", 
            "current_location": "Projeto Vinculado 1", 
            "status": ToolStatus.IN_USE,
            "next_maintenance": date.today() + timedelta(days=15) # Warning range
        },
        {
            "name": "OTDR Exfo MaxTester", 
            "serial_number": "OTDR-730", 
            "category": ToolCategory.INSTRUMENT,
            "condition": ToolCondition.NEW,
            "current_holder": "Maria Santos", 
            "current_location": "Projeto Vinculado 2", 
            "status": ToolStatus.IN_USE,
            "next_maintenance": date.today() + timedelta(days=120)
        },
        {
            "name": "Alicate Amperímetro Fluke", 
            "serial_number": "ALI-376", 
            "category": ToolCategory.INSTRUMENT,
            "condition": ToolCondition.FAIR,
            "current_holder": "Almoxarifado", 
            "current_location": "Almoxarifado", 
            "status": ToolStatus.MAINTENANCE,
            "next_maintenance": date.today() - timedelta(days=5) # Expired
        },
        {
            "name": "Kit Ferramentas Básico", 
            "serial_number": "KIT-005", 
            "category": ToolCategory.KIT,
            "condition": ToolCondition.GOOD,
            "current_holder": "Almoxarifado", 
            "current_location": "Escritório", 
            "status": ToolStatus.AVAILABLE,
            "next_maintenance": None
        },
        {
            "name": "Escada Extensiva 7M",
            "serial_number": "ESC-010",
            "category": ToolCategory.ACCESS,
            "condition": ToolCondition.GOOD,
            "current_holder": "Pedro Souza",
            "current_location": "Viatura 01",
            "status": ToolStatus.IN_USE,
            "next_maintenance": None
        }
    ]
    
    tools = []
    for tool_data in tools_data:
        tool = Tool(**tool_data)
        db.add(tool)
        tools.append(tool)
    
    await db.flush()
    print("✅ Ferramentas criadas.")
    return tools

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
        company_id = 1 # Default to Centauro (1) for seed, or random.randint(1, 2)
        
        if contract_type == "LPU":
            prefix = f"CEL{company_id}"
            cel_count += 1
            seq = f"{cel_count:02d}"
        else:
            prefix = f"CEC{company_id}"
            cec_count += 1
            seq = f"{cec_count:02d}"
        
        # New Tag Format: CEL1_CNPJ_YYMM_SEQ (Simplified for seed as CEL1_YYMM_SEQ_CLIENT to match prev logic somewhat but with new prefix)
        # User requested: CEL{CNPJ}_{YY}{MM}_{Seq}
        # But wait, earlier summary said: CEL{company_id}_{YY}{MM}_{Seq}
        # Let's stick to: PREFIX_YYMM_SEQ_CLIENT. 
        # Actually user said: "The tag format for contracts is now CEL/CEC{CNPJ}_{YY}{MM}_{Seq}"
        # Where {CNPJ} is really {company_id} mapped.
        # So: CEL1_2412_01 (Client ID is not in the user's requested format 'CEL{CNPJ}_{YY}{MM}_{Seq}'?)
        # Let's assume the user meant CEL{company_id}_{YY}{MM}_{Seq}
        
        tag = f"{prefix}_{yy}{mm}_{client_num}_{seq}"
        
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
            readjustment_index=readjustment_index,
            company_id=company_id
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
        client = clients[i % len(clients)] if len(clients) > 0 else None
        if not client: continue
        seq = f"{i+1:02d}"
        client_num = client.client_number
        
        company_id = 1
        # Tag format: CEP{company_id}_{YY}{MM}_{Client}_{Seq}
        tag = f"CEP{company_id}_{yy}{mm}_{client_num}_{seq}"
        
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
            budget=random.randint(15000, 60000),
            company_id=company_id,
            estimated_days=random.randint(30, 120),
            warranty_months=random.choice([12, 24, 36])
        )
        db.add(project)
        created_projects.append(project)
        
    # 2. Linked Projects (8)
    print("   Creating 8 Linked Projects...")
    # Distribute 8 projects among 5 contracts
    distribution = [2, 2, 2, 1, 1]
    
    proj_count = 0
    for i, count in enumerate(distribution):
        contract = contracts[i % len(contracts)] if len(contracts) > 0 else None
        if not contract: continue
        for j in range(count):
            proj_count += 1
            seq = f"{j+1:02d}"
            # Linked projects inherit contract tag prefix usually, or append Pxx
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
                budget=random.randint(15000, 60000),
                company_id=contract.company_id,
                estimated_days=random.randint(30, 120),
                warranty_months=random.choice([12, 24, 36])
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
        contract_id = contracts[i % len(contracts)].id if len(contracts) > 0 else None
        responsible_id = collaborators[i % len(collaborators)].id if len(collaborators) > 0 else None
        ticket = Ticket(
            **data,
            contract_id=contract_id,
            responsible_id=responsible_id
        )
        db.add(ticket)
        
    await db.flush()
    print("✅ Tickets criados.")

async def seed_purchases(db, projects):
    """Cria solicitações de compra vinculadas a projetos (Material e Serviço)"""
    print("🔍 Criando solicitações de compra e serviço...")
    
    # 1. Material Requests
    for i, project in enumerate(projects[:3]): 
        request = PurchaseRequest(
            project_id=project.id,
            description=f"Materiais Elétricos para {project.name}",
            requester="Engenheiro Responsável",
            status="pending",
            category="MATERIAL",
            shipping_cost=random.randint(50, 200)
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
            
    # 2. Service/Rental Requests (Container/Machinery)
    for i, project in enumerate(projects[3:6]):
        current_project = project
        
        # Rental types
        rentals = [
            {"desc": "Locação de Container 20pés", "mobilization": 1500.00, "daily": 45.00},
            {"desc": "Locação de Andaime Tubular", "mobilization": 300.00, "daily": 15.00},
            {"desc": "Aluguel de Gerador 55kVA", "mobilization": 800.00, "daily": 250.00},
        ]
        
        rental_data = rentals[i % 3]
        
        start_date = date.today() + timedelta(days=5)
        is_indefinite = (i % 2 == 0) # Alternate indefinite
        end_date = None if is_indefinite else start_date + timedelta(days=30)
        
        request = PurchaseRequest(
            project_id=current_project.id,
            description=f"{rental_data['desc']} - Mobilização",
            requester="Coordenador de Obra",
            status="approved",
            category="SERVICE",
            shipping_cost=rental_data["mobilization"], # Mobilization cost
            service_start_date=start_date,
            service_end_date=end_date,
            is_indefinite_term=is_indefinite
        )
        db.add(request)
        await db.flush()
        
        # Item itself is the monthly/daily rate reference
        item = PurchaseItem(
            request_id=request.id,
            description=rental_data['desc'],
            quantity=1,
            unit="diaria" if not is_indefinite else "mensal",
            unit_price=rental_data['daily'],
            total_price=rental_data['daily'] * (30 if is_indefinite else 30), # Estimate
            status="quoted"
        )
        db.add(item)

    await db.flush()
    print("✅ Solicitações de compra e serviço criadas.")

async def seed_billings(db, projects):
    """Cria faturamentos com diversos status"""
    print("🔍 Criando faturamentos (Contas a Receber)...")
    
    from app.models.finance import BillingStatus
    
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
                status_choice = BillingStatus.PREVISTO # Fallback
            
            # New Fields Logic
            category = "SERVICE"
            gross_value = value
            net_value = value
            taxes_verified = False
            retention_iss = 0
            
            # Simulate 30% of paid bills having taxes verified/imported
            if status_choice == BillingStatus.PAGO and random.random() < 0.3:
                 taxes_verified = True
                 category = "SERVICE"
                 retention_iss = value * 0.05 # 5% ISS
                 net_value = value - retention_iss

            billing = ProjectBilling(
                project_id=project.id,
                value=value,
                gross_value=gross_value, 
                net_value=net_value,
                category=category,
                taxes_verified=taxes_verified,
                retention_iss=retention_iss,
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
            gross_value=5000,
            net_value=5000,
            category="SERVICE",
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
            gross_value=5000,
            net_value=5000,
            category="SERVICE",
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

async def seed_allocations(db, collaborators, fleet, projects, tools):
    """Cria alocações de recursos em projetos e vincula às tabelas de recursos do projeto"""
    print("🔍 Criando alocações e vinculando recursos...")
    
    today = date.today()
    created_allocations = []
    
    # 1. Allocate Collaborators
    # Allocate first 10 collaborators to different projects for a range of dates
    print("   Allocating 10 collaborators...")
    if not projects:
        print("⚠️ Sem projetos criados, ignorando alocacoes.")
        return
        
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
            
    # 3. Allocate Tools
    # Allocate all tools to remaining projects
    print("   Allocating 5 tools...")
    for i, tool in enumerate(tools):
        proj = projects[(i+5) % len(projects)]
        
        start_date = today + timedelta(days=random.randint(0, 5))
        duration = random.randint(10, 30)
        end_date = start_date + timedelta(days=duration)
        
        # Create ProjectTool link
        proj_tool = ProjectTool(
            project_id=proj.id,
            tool_id=tool.id,
            quantity=1, # Tools are scalar/unique now
            start_date=start_date,
            end_date=end_date
        )
        db.add(proj_tool)
        
        # Update Tool Status
        if tool.status == ToolStatus.IN_USE:
             tool.current_holder = proj.coordinator or "Equipe"
             tool.current_location = proj.name
             db.add(tool)

        # Create Daily Allocations
        current_date_tool = start_date
        while current_date_tool <= end_date:
            if current_date_tool.weekday() != 6: # Skip Sunday
                alloc = Allocation(
                    date=current_date_tool,
                    resource_type=ResourceType.TOOL, # Using the TOOL enum
                    resource_id=tool.id,
                    project_id=proj.id,
                    description=f"{tool.name} em uso no projeto {proj.name}",
                    type=AllocationType.RESERVATION
                )
                db.add(alloc)
                created_allocations.append(alloc)
            
            current_date_tool += timedelta(days=1)
    
    await db.flush()
    print(f"✅ Recursos vinculados e {len(created_allocations)} alocações diárias criadas.")

async def assign_user_to_all_teams(db, target_email: str):
    """Adiciona um usuário específico a todos os times existentes"""
    print(f"🔄 Adicionando {target_email} a todos os times...")
    
    # Get Collaborator linked to this email
    # Assuming email matches or we find by name if email differs (Lucas Silva / lucas.silva)
    # The collab seed uses email logic: name.lower()...
    # The user seed uses: lucas.silva@centauro.com.br
    # Let's find collab by name "Lucas Silva"
    
    stmt_collab = select(Collaborator).where(Collaborator.name == "Lucas Silva")
    result_collab = await db.execute(stmt_collab)
    collab = result_collab.scalars().first()
    
    if not collab:
        print("⚠️ Colaborador Lucas Silva não encontrado para associação aos times.")
        return

    # Get All Teams
    stmt_teams = select(Team)
    result_teams = await db.execute(stmt_teams)
    teams = result_teams.scalars().all()
    
    count = 0
    for team in teams:
        # Check if already member (using sync checking or direct insert ignore)
        # We can just try to insert and ignore error or check first.
        # Check via query
        stmt_check = select(collaborator_teams).where(
            (collaborator_teams.c.collaborator_id == collab.id) & 
            (collaborator_teams.c.team_id == team.id)
        )
        res_check = await db.execute(stmt_check)
        if not res_check.first():
            await db.execute(
                collaborator_teams.insert().values(collaborator_id=collab.id, team_id=team.id)
            )
            count += 1
            
    await db.flush()
    print(f"✅ Lucas Silva adicionado a {count} novos times (Total: {len(teams)}).")

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
        
    # Assign Lucas Silva to all teams
    await assign_user_to_all_teams(db, lucas_email)
        
    # Create additional team users
    extra_emails = [
        "lucas@centauro.com.br", 
        "fernando@centauro.com.br", 
        "yan@centauro.com.br", 
        "diego@centauro.com.br", 
        "fabiano@centauro.com.br", 
        "hugo@centauro.com.br", 
        "cerdeira@centauro.com.br", 
        "ivan@centauro.com.br"
    ]
    
    hashed_password = get_password_hash("senha123")
    
    for email in extra_emails:
        stmt = select(User).filter(User.email == email)
        result = await db.execute(stmt)
        existing_user = result.scalars().first()
        
        if not existing_user:
            new_user = User(
                email=email,
                password_hash=hashed_password,
                role=UserRole.ADMIN, # Defaulting to admin so they have full access initially
                is_superuser=False
            )
            db.add(new_user)
            print(f"✅ Adicionado usuário extra: {email} / senha123")
        else:
            print(f"ℹ️ Usuário {email} já existia.")
            
    await db.flush()
        
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
            tools = await seed_tools(db)
            
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
            await seed_allocations(db, collaborators, fleet, projects, tools)
            
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
