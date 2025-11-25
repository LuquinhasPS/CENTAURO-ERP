# Centauro ERP

Sistema ERP completo para empresas de engenharia e telecomunicações, com gestão unificada de projetos, frota, ferramentas e equipe.

## 🚀 Tecnologias

**Backend:**
- Python 3.10+
- FastAPI (Framework web assíncrono)
- SQLAlchemy (ORM async)
- Pydantic (Validação de dados)
- SQLite/PostgreSQL

**Frontend:**
- React 18
- Vite (Build tool)
- React Router (Navegação)
- Recharts (Gráficos)
- @dnd-kit (Drag & Drop)
- Axios (HTTP client)

## 📋 Funcionalidades

### Módulos Implementados

1. **Dashboard Financeiro**
   - Gráficos de orçado vs realizado
   - Cards com métricas principais
   - Tendências mensais

2. **Gestão de Projetos**
   - CRUD completo
   - Vínculo opcional com contratos
   - Campos financeiros detalhados
   - Tags únicas

3. **Gestão de Frota**
   - Cadastro de veículos
   - Rastreamento de seguro (CNPJ e vigência)
   - Status (Ativo/Manutenção)

4. **Gestão de Ferramentas**
   - Rastreamento obrigatório: "Com quem está"
   - Rastreamento opcional: "Onde está"
   - Status (Disponível/Em Uso/Manutenção)

5. **Sistema de Tickets**
   - Chamados de manutenção
   - Prioridades (Baixa/Média/Alta/Crítica)
   - Status rastreável

6. **Scheduler (Timeline)**
   - Visualização tipo Gantt
   - Alocação de recursos (Carros e Pessoas)
   - Navegação semanal/mensal

7. **Kanban**
   - Gestão de tarefas
   - Drag & Drop
   - 3 colunas (A Fazer/Em Progresso/Concluído)

## 🚀 Como Executar

### Backend

```bash
# 1. Instalar dependências
cd backend
pip install -r requirements.txt

# 2. (Opcional) Configurar banco de dados
# Copie .env.example para .env e ajuste conforme necessário
cp .env.example .env

# 3. Iniciar servidor
uvicorn app.main:app --reload
```

**API disponível em:** http://127.0.0.1:8000  
**Documentação Swagger:** http://127.0.0.1:8000/docs

### Frontend

```bash
# 1. Instalar dependências
cd frontend
npm install

# 2. Iniciar servidor de desenvolvimento
npm run dev
```

**Aplicação disponível em:** http://localhost:5173

## 📁 Estrutura do Projeto

```
CENTAURO ERP 2/
├── backend/
│   ├── app/
│   │   ├── models/       # SQLAlchemy Models
│   │   ├── schemas/      # Pydantic Schemas
│   │   ├── routers/      # API Endpoints
│   │   ├── database.py   # Configuração DB
│   │   └── main.py       # FastAPI App
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/   # Layout, Navigation
    │   ├── pages/        # 7 páginas principais
    │   ├── services/     # API Client
    │   └── index.css     # Design System
    ├── package.json
    └── index.html
```

## 🗄️ Banco de Dados

### Configuração Padrão (SQLite)
O sistema vem configurado com SQLite para facilitar o desenvolvimento. Nenhuma configuração adicional necessária.

### Migração para PostgreSQL (Produção)

1. Edite `backend/app/database.py`:
```python
DATABASE_URL = "postgresql+asyncpg://user:password@localhost/centauro_erp"
```

2. Instale PostgreSQL e crie database:
```sql
CREATE DATABASE centauro_erp;
```

3. Reinicie o backend - as tabelas serão criadas automaticamente

## 🎨 Design

O sistema utiliza um design moderno com:
- Gradientes e animações suaves
- Cards visuais para melhor organização
- Paleta de cores profissional
- Layout responsivo
- Sidebar de navegação intuitiva

## 📝 API Endpoints

### Commercial
- `GET/POST /commercial/clients`
- `GET/POST /commercial/contracts`
- `GET/POST /commercial/projects`
- `GET/DELETE /commercial/projects/{id}`

### Assets
- `GET/POST /assets/fleet`
- `DELETE /assets/fleet/{id}`
- `GET/POST /assets/tools`
- `DELETE /assets/tools/{id}`

### Operational
- `GET/POST /operational/allocations`
- `GET/POST /operational/collaborators`

### Tickets
- `GET/POST /tickets/tickets`

## 🔧 Próximos Passos

- [ ] Validação client-side nos formulários
- [ ] Função de edição de registros
- [ ] Paginação para tabelas grandes
- [ ] Filtros e busca
- [ ] Autenticação JWT
- [ ] Geração de relatórios PDF
- [ ] Notificações de vencimento
- [ ] WebSockets para atualizações em tempo real

## 📄 Licença

Este projeto foi desenvolvido para uso interno da empresa.
