# 💰 Controle Financeiro Pessoal

Uma aplicação web completa e moderna para controle de finanças pessoais, contendo autenticação segura, gestão de lançamentos/categorias, e um dashboard interativo com relatórios financeiros.

O projeto foi construído seguindo boas práticas de desenvolvimento de software, com uma arquitetura modular tanto no backend quanto no frontend, garantindo escalabilidade e facilidade de manutenção.

---

## 🚀 Principais Funcionalidades

- **Autenticação Segura**: Cadastro de usuários e login protegidos com senhas criptografadas e autenticação baseada em tokens JWT.
- **Gestão de Categorias**: CRUD completo de categorias personalizadas por usuário para classificar os lançamentos.
- **Controle de Lançamentos (Transações)**: Registro de receitas e despesas com filtros avançados por data, tipo e categoria, além de paginação de dados.
- **Dashboard Interativo**: Painel visual com resumos financeiros mensais, gráficos de pizza por categoria e gráficos de barra com a evolução de receitas vs. despesas.
- **Design Responsivo & Temático**: Interface moderna com suporte a múltiplos dispositivos e tema visual otimizado.

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18** + **Vite** (Ambiente de desenvolvimento rápido)
- **Tailwind CSS** (Estilização responsiva e moderna)
- **React Router** (Navegação dinâmica)
- **Zustand** (Gerenciamento de estado global leve e otimizado)
- **Recharts** (Visualização de dados com gráficos interativos)
- **Axios** (Integração simplificada com a API)

### Backend
- **Node.js** + **Express** (API REST rápida e modular)
- **Prisma ORM** (Integração com banco de dados e controle de migrations)
- **JWT (JSON Web Tokens)** & **Bcrypt** (Segurança e criptografia)

### Infraestrutura & Ferramentas
- **Docker & Docker Compose** (Ambiente local padronizado com PostgreSQL)
- **PostgreSQL** (Banco de dados relacional robusto)
- **GitHub Actions** (Pipelines de Integração Contínua - CI)

---

## 📁 Estrutura do Projeto

A organização das pastas foi estruturada de forma modular para isolar responsabilidades:

```text
financeiro-pessoal/
├── backend/                  # Código do servidor Express
│   ├── prisma/               # Schemas e migrations do banco de dados
│   └── src/
│       ├── config/           # Configurações globais (CORS, Banco de Dados)
│       ├── middlewares/      # Interceptadores de segurança (Autenticação JWT)
│       ├── modules/          # Módulos de domínio (auth, categories, transactions)
│       └── utils/            # Funções utilitárias auxiliares
├── frontend/                 # Código da aplicação React
│   └── src/
│       ├── components/       # Componentes reutilizáveis de UI e gráficos
│       ├── hooks/            # Custom React Hooks
│       ├── pages/            # Telas da aplicação (Login, Dashboard, etc.)
│       ├── services/         # Configurações de chamada da API REST
│       └── store/            # Gerenciamento de estado com Zustand
└── docker-compose.yml        # Configuração do PostgreSQL em Docker
```

---

## ⚙️ Como Executar o Projeto Localmente

### Pré-requisitos
- **Node.js** (versão 18 ou superior)
- **Docker & Docker Compose** (instalados e em execução)

### 1. Inicializar o Banco de Dados (PostgreSQL)
Na raiz do projeto, execute o comando para subir o container do banco:
```bash
docker compose up -d
```
O PostgreSQL estará disponível em `localhost:5432`.

### 2. Configurar e Executar o Backend
Navegue até a pasta do servidor:
```bash
cd backend
```
1. Instale as dependências:
   ```bash
   npm install
   ```
2. Crie e configure o arquivo de variáveis de ambiente:
   ```bash
   cp .env.example .env
   ```
3. Execute as migrations para criar as tabelas no banco de dados:
   ```bash
   npm run db:migrate:init
   ```
4. Inicie o servidor em modo de desenvolvimento:
   ```bash
   npm run dev
   ```
O servidor estará rodando em `http://localhost:3333` e o endpoint de health check em `http://localhost:3333/health`.

### 3. Configurar e Executar o Frontend
Navegue até a pasta da aplicação cliente:
```bash
cd ../frontend
```
1. Instale as dependências:
   ```bash
   npm install
   ```
2. Crie o arquivo de variáveis de ambiente:
   ```bash
   cp .env.example .env
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
A aplicação estará acessível em `http://localhost:5173`.

---

## 🔌 API Endpoints (Visão Geral)

### Autenticação (`/api/auth`)
- `POST /register` - Cadastro de novos usuários.
- `POST /login` - Autenticação de usuários com retorno de token.
- `GET /me` - Recupera informações do usuário logado através do token JWT.

### Categorias (`/api/categories`)
- `GET /` - Lista as categorias do usuário logado.
- `POST /` - Cria uma nova categoria.
- `PUT /:id` - Atualiza uma categoria existente.
- `DELETE /:id` - Remove uma categoria.

### Transações (`/api/transactions`)
- `GET /` - Lista as transações com suporte a filtros e paginação.
- `POST /` - Cria uma nova transação (receita ou despesa).
- `PUT /:id` - Atualiza uma transação existente.
- `DELETE /:id` - Remove uma transação.
- `GET /summary` - Retorna o resumo consolidado de valores para o dashboard.

---

## 🛡️ Destaques de Desenvolvimento (Boas Práticas)
- **Modularização de Código**: Divisão clara por domínios (`modules`) no backend, isolando controllers, rotas e regras de negócio.
- **Segurança**: Criptografia de senhas usando hashing com `bcrypt` e proteção de rotas com autenticação baseada em JWT.
- **Versionamento de Banco de Dados**: Schema de banco versionado de maneira estruturada via Prisma Migrations.
- **Gerenciamento de Estado**: Utilização do `Zustand` no frontend, evitando re-renderizações desnecessárias e simplificando o fluxo de dados em comparação com a Context API tradicional.
