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
from app.models.operational import Collaborator, Certification, CertificationType
from app.models.commercial import Client, Contract, Project, ProjectBilling
from app.models.assets import Fleet, FuelType, Insurance, Tool, ToolStatus
from app.models.tickets import Ticket, TicketStatus, TicketPriority
from app.models.purchases import PurchaseRequest, PurchaseItem
from sqlalchemy import select, delete

async def clear_data(db):
    """Limpa todos os dados do banco para um seed limpo"""
    print("🧹 Limpando dados existentes...")
    
    # Ordem importa devido a Foreign Keys
    await db.execute(delete(PurchaseItem))
    await db.execute(delete(PurchaseRequest))
    await db.execute(delete(Ticket))
    await db.execute(delete(ProjectBilling))
    await db.execute(delete(Project))
    await db.execute(delete(Contract))
    await db.execute(delete(Certification))
    await db.execute(delete(Tool))
    await db.execute(delete(Collaborator))
    await db.execute(delete(Fleet))
    await db.execute(delete(Insurance))
    await db.execute(delete(Client))
    await db.execute(delete(Role))
    
    await db.commit()
    print("✨ Dados limpos!")

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
    
    for v_data in vehicles:
        vehicle = Fleet(**v_data)
        db.add(vehicle)
    
    await db.flush()
    print(f"✅ {len(vehicles)} veículos criados.")

async def seed_collaborators(db, roles_map):
    """Cria 10 colaboradores com certificações"""
    print("🔍 Criando 10 colaboradores...")
    
    first_names = ["Lucas", "Ana", "Pedro", "Maria", "João", "Julia", "Carlos", "Fernanda", "Rafael", "Bruna"]
    last_names = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes"]
    
    roles_list = list(roles_map.keys())
    new_collabs = []
    
    for i in range(10):
        name = f"{first_names[i]} {last_names[i]}"
        role_name = random.choice(roles_list)
        role_id = roles_map[role_name]
        
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
            salary=salary,
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
            
    print(f"✅ Colaboradores e certificações criados.")
    return new_collabs

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
    
    # Mix of types and statuses
    # 0: LPU, Ativo
    # 1: RECORRENTE, Ativo
    # 2: LPU, Vencido
    # 3: RECORRENTE, Vencido
    # 4: LPU, Ativo
    
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

async def main():
    print("🌱 Iniciando seed de dados (REFAZENDO TUDO)...")
    try:
        async with AsyncSessionLocal() as db:
            await clear_data(db)
            
            roles_map = await seed_roles(db)
            clients = await seed_clients(db)
            insurances = await seed_insurances(db)
            await seed_fleet(db, insurances)
            collaborators = await seed_collaborators(db, roles_map)
            await seed_tools(db)
            
            contracts = await seed_contracts(db, clients)
            projects = await seed_projects(db, clients, contracts)
            
            await seed_tickets(db, contracts, collaborators)
            await seed_purchases(db, projects)
            await seed_billings(db, projects)
            
            await db.commit()
            print("✨ Seed concluído com sucesso!")
            
    except Exception as e:
        print(f"❌ Erro ao popular banco de dados: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
