# Financeiro Pessoal

Aplicação web para controle financeiro pessoal com cadastro/login, categorias, lançamentos e dashboard mensal.

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

Deploy sugerido:

- Railway para API e banco PostgreSQL
- Vercel para frontend
- GitHub Actions para CI

## Estrutura

```txt
financeiro-pessoal/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── config/
│       ├── middlewares/
│       ├── modules/
│       │   ├── auth/
│       │   ├── categories/
│       │   └── transactions/
│       ├── utils/
│       └── app.js
└── frontend/
    └── src/
        ├── components/
        ├── hooks/
        ├── pages/
        ├── services/
        ├── store/
        └── main.jsx
```

## Setup local

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run db:generate
npx prisma migrate dev
npm run dev
```

Variaveis principais:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/financeiro_pessoal"
JWT_SECRET="troque-este-segredo"
FRONTEND_URL="http://localhost:5173"
PORT=3333
```

Para subir um PostgreSQL local com Docker:

```bash
docker compose up -d
cd backend
npm run db:migrate:init
npm run dev
```

### Frontend

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

## Funcionalidades

MVP:

- Cadastro e login com JWT
- Hash de senha com bcrypt
- Rota protegida por token
- Lancamentos de receita, despesa e transferencia
- Categorias customizaveis via API
- Filtro por tipo e categoria
- Dashboard com saldo, receitas, despesas
- Grafico mensal de receitas x despesas
- Grafico de gastos por categoria

Versao 2 (WIP):

- Metas mensais por categoria
- Alerta visual ao ultrapassar meta
- Barra de progresso por meta
- Lancamentos recorrentes mensais
- Exportacao CSV por periodo
- Relatorio mensal PDF

## Modelagem de dados

### users

| Campo | Tipo |
| --- | --- |
| id | uuid PK |
| name | varchar(100) |
| email | varchar unique |
| password_hash | varchar |
| created_at | timestamp |

### categories

| Campo | Tipo |
| --- | --- |
| id | uuid PK |
| user_id | uuid FK users |
| name | varchar(60) |
| color | varchar(7) |
| icon | varchar(40) |
| type | enum(INCOME, EXPENSE, BOTH) |

### transactions

| Campo | Tipo |
| --- | --- |
| id | uuid PK |
| user_id | uuid FK users |
| category_id | uuid FK categories |
| type | enum(INCOME, EXPENSE, TRANSFER) |
| amount | decimal(10,2) |
| description | varchar(200) |
| date | date |
| created_at | timestamp |

## Roadmap

### Sprint 1 · 1-2 semanas

- Setup do projeto Vite + Express
- Banco PostgreSQL + migrations
- Cadastro e login com JWT
- Rota protegida no frontend
- Layout base responsivo

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
