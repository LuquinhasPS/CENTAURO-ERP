# 📘 Centauro ERP 2.0 - Documentação Técnica

Este documento fornece uma visão técnica aprofundada da arquitetura do sistema **Centauro ERP**, com foco especial no módulo de Inteligência Artificial (RAG).

---

## 🏗️ 1. Arquitetura do Sistema

O sistema segue uma arquitetura **Client-Server** moderna, desacoplada via REST API.

### **Backend (O Motor)**
- **Framework**: FastAPI (Python). Escolhido pela alta performance (asinchronous) e validação automática de dados via Pydantic.
- **ORM**: SQLAlchemy. Gerencia a interação com o banco de dados de forma orientada a objetos.
- **Banco de Dados**: SQLite (`centauro.db`). Escolha estratégica para desenvolvimento ágil e consistência relacional (ACID) sem a complexidade de servidores dedicados.
- **Autenticação**: JWT (JSON Web Tokens) com OAuth2.

### **Frontend (A Interface)**
- **Tecnologia**: React.js com Build Tool Vite.
- **Estilo**: Componentização moderna.
- **Comunicação**: Consumo da API via HTTP/Axios.

### **Principais Módulos**
1.  **Recursos Humanos**: Gestão de Colaboradores, Salários, Certificações (NRs, ASO).
2.  **Frota e Ativos**: Controle de Veículos, Ferramentas e Manutenções.
3.  **Operacional**: Alocação de recursos em Projetos e Contratos.

---

## 🤖 2. IA e Analytics (RAG Text-to-SQL)

O grande diferencial do projeto é o **Agente de IA** capaz de responder perguntas de negócio consultando o banco de dados em tempo real.

### **Por que não RAG Tradicional?**
RAG Tradicional (Vector/Embeddings) é ótimo para **textos desestruturados** (PDFs, docs). 
Para um ERP financeiro/operacional, precisávamos de **precisão matemática**. Vetores não sabem somar salários ou filtrar datas com exatidão. Por isso, adotamos a arquitetura **Structured RAG (Text-to-SQL)**.

### **Fluxo de Execução (Pipeline)**

O agente segue um pipeline rigoroso para transformar linguagem natural em dados:

1.  **Entrada (Input)**:
    *   Pergunta do Usuário: *"Quantos colaboradores ganham mais de R$ 3.000?"*
    *   Contexto (Schema): O agente recebe o mapa estrutural do banco (Tabelas: `collaborators`, Colunas: `name`, `salary`, etc).

2.  **Raciocínio (LLM - Google Gemini 2.5):**
    *   O modelo atua como um **Especialista SQL**. Ele não "adivinha" a resposta, ele **escreve o código** para encontrar a resposta.
    *   *Prompt Engineering*: "Use a tabela `collaborators`. A coluna `salary` é string, então faça o cast para float removendo 'R$'."

3.  **Sanitização (Segurança):**
    *   Uma camada de middleware intercepta o SQL gerado pelo Gemini e remove artefatos de markdown (ex: ```sqlite ... ```) para evitar erros de sintaxe.

4.  **Execução (Query Execution):**
    *   O backend executa a query limpa no `centauro.db`.
    *   Resultado Bruto: `[(5,)]`.

5.  **Síntese (Resposta Natural):**
    *   O LLM recebe o resultado bruto e devolve: *"Atualmente, existem 5 colaboradores com salário acima de R$ 3.000."*

---

## 🚀 3. Diferenciais de Engenharia

Durante o desenvolvimento, enfrentamos desafios reais de ambiente:

*   **Custom Chain Implementation**:
    *   *Problema*: As funções prontas de abstração (`create_sql_query_chain`) falharam devido a conflitos de versão no ambiente.
    *   *Solução*: Em vez de tentar "arrumar a caixa preta", **reescrevi a lógica da chain manualmente**. Isso demonstra domínio sobre como o LangChain funciona por baixo dos panos (LCEL - LangChain Expression Language) e garante que o código seja transparente e fácil de manter.

*   **Bypass de Autenticação (Dev Mode)**:
    *   Implementamos um sistema inteligente que detecta ambiente de desenvolvimento e permite login automático como Admin, acelerando o ciclo de testes sem comprometer a segurança em produção.
