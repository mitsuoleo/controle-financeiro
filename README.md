# Financeiro Pessoal

Aplicacao web para controle financeiro pessoal com cadastro/login, categorias, lancamentos e dashboard mensal.

## Stack

Frontend:

- React 18 + Vite
- Tailwind CSS
- React Router
- Zustand
- Axios
- Recharts

Backend:

- Node.js + Express
- JWT + bcrypt
- PostgreSQL
- Prisma ORM

Infra local:

- Docker Compose para PostgreSQL
- Prisma Migrate para versionamento do banco

Deploy sugerido:

- Railway para API e banco PostgreSQL
- Vercel para frontend
- GitHub Actions para CI

## Setup local

### 1. Banco de dados

Na raiz do projeto:

```bash
docker compose up -d
```

Isso sobe um PostgreSQL local em `localhost:5432`.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate:init
npm run dev
```

Variaveis principais:

```env
DATABASE_URL="postgresql://financeiro:financeiro@localhost:5432/financeiro_db?schema=public"
JWT_SECRET="troque_por_uma_string_longa_e_aleatoria"
JWT_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:5173,http://127.0.0.1:5173"
PORT=3333
NODE_ENV=development
```

API local:

```txt
http://localhost:3333
```

Health check:

```txt
http://localhost:3333/health
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Variavel principal:

```env
VITE_API_URL=http://localhost:3333/api
```

App local:

```txt
http://localhost:5173
```

## Scripts uteis

Backend:

```bash
npm run dev
npm run start
npm run test
npm run test:smoke
npm run db:generate
npm run db:migrate:init
npm run db:migrate
```

Frontend:

```bash
npm run dev
npm run build
npm run preview
```

## Estrutura

```txt
financeiro-pessoal/
+-- backend/
|   +-- prisma/
|   |   +-- schema.prisma
|   +-- src/
|       +-- config/
|       +-- middlewares/
|       +-- modules/
|       |   +-- auth/
|       |   +-- categories/
|       |   +-- transactions/
|       +-- utils/
|       +-- app.js
+-- frontend/
|   +-- src/
|       +-- components/
|       +-- hooks/
|       +-- pages/
|       +-- services/
|       +-- store/
|       +-- main.jsx
+-- docker-compose.yml
```

## Sprint 1

Status: em fechamento.

Entregas:

- Setup do projeto com Vite + Express
- Banco PostgreSQL local com Docker Compose
- Migrations com Prisma
- Cadastro e login com JWT
- Hash de senha com bcrypt
- Rota protegida no frontend
- Layout base responsivo
- Smoke test de autenticacao

Checklist de verificacao:

```bash
cd backend
npm run test
npm run test:smoke

cd ../frontend
npm run build
```

## Roadmap

### Sprint 2

- Tela de categorias
- CRUD de categorias no frontend
- Melhorias no formulario de lancamentos
- Filtros por data, tipo e categoria
- Paginacao da listagem

### Sprint 3

- Seletor de mes/ano no dashboard
- Cards de resumo refinados
- Grafico mensal com Recharts
- Grafico de categorias em pizza
- Ajustes finais de responsividade
- Deploy Railway + Vercel

## Endpoints

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

Categories:

- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`

Transactions:

- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`
- `GET /api/transactions/summary`
