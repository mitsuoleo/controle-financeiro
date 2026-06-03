# Design da Sprint 4: Metas de Economia & Relatórios de Exportação

Este documento detalha o design técnico e funcional das duas principais frentes da Sprint 4 do Controle Financeiro Pessoal:
1. **Metas de Economia (Objetivos)** com aportes integrados às transações reais do usuário.
2. **Relatórios e Exportação** gerados diretamente no navegador (client-side) nos formatos PDF e CSV.

---

## 1. Modelo de Dados (Prisma Database Schema)

Adição do modelo `Goal` (Metas) e criação de relacionamentos nos modelos `User` e `Transaction`:

```prisma
// backend/prisma/schema.prisma

model User {
  id        String   @id @default(uuid())
  // ... outros campos
  goals     Goal[]   // Relacionamento com as metas do usuário
}

model Goal {
  id            String       @id @default(uuid())
  userId        String       @map("user_id")
  name          String       @db.VarChar(100)
  targetAmount  Decimal      @db.Decimal(10, 2) @map("target_amount")
  currentAmount Decimal      @default(0.00) @db.Decimal(10, 2) @map("current_amount")
  deadline      DateTime     @db.Date
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")

  user          User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions  Transaction[]

  @@map("goals")
}

model Transaction {
  id                   String          @id @default(uuid())
  // ... outros campos
  goalId               String?         @map("goal_id")
  
  goal                 Goal?           @relation(fields: [goalId], references: [id], onDelete: SetNull)
}
```

---

## 2. API do Backend (Express REST API)

### Endpoints de Metas (`/api/goals`)
* `GET /api/goals` — Retorna todas as metas do usuário logado.
* `POST /api/goals` — Cria uma nova meta (`name`, `targetAmount`, `deadline`).
* `PUT /api/goals/:id` — Atualiza uma meta existente (`name`, `targetAmount`, `deadline`).
* `DELETE /api/goals/:id` — Remove uma meta. As transações associadas permanecem, mas com `goalId` nulo.

### Lógica de Sincronização de Saldos
Os aportes para metas de economia serão transações reais do tipo `EXPENSE` vinculadas a uma meta através do `goalId`. 
* **Criação de Aporte:** Quando uma transação do tipo `EXPENSE` com `goalId` válido é criada, o valor da transação é adicionado ao `currentAmount` da meta.
* **Edição de Aporte:** O backend calcula a diferença entre o valor antigo e o novo, ajustando o saldo acumulado (`currentAmount`) da meta.
* **Exclusão de Aporte:** O valor da transação excluída é subtraído do `currentAmount` da meta.

---

## 3. Interface do Usuário (React + Tailwind CSS)

### Nova Rota: `/goals` (Objetivos)
* **Lista de Metas:** Grid com cards visuais contendo barra de progresso em gradiente, porcentagem poupada, valor acumulado vs. valor alvo e dias restantes até a data limite.
* **Ação de Aporte:** Botão rápido "Fazer Aporte" em cada card, que abre o modal de criação de transações pré-selecionando o tipo `Despesa` e a `Meta` em questão.
* **Formulários:** Modal para criação/edição de metas informando Nome, Valor Alvo e Data Limite.

### Widget de Dashboard
* Uma seção lateral ou painel resumido mostrando o status e barra de progresso rápido das metas mais próximas do prazo final.

### Relatórios e Exportações (Tela de Lançamentos)
* Adição de botões "Exportar PDF" e "Exportar CSV" na seção de filtros de transações.
* **Exportação PDF:** Utiliza a biblioteca `jspdf` e `jspdf-autotable` para criar um relatório contendo cabeçalho institucional, filtros aplicados, receita/despesa consolidada no período e tabela completa dos registros visíveis.
* **Exportação CSV:** Utiliza a API nativa do navegador (String/Blob/URL) para gerar e baixar planilhas de dados estruturados instantaneamente.
