import prisma from '../../config/db.js'

const VALID_TRANSACTION_TYPES = new Set(['INCOME', 'EXPENSE', 'TRANSFER'])

async function ensureCategoryBelongsToUser(categoryId, userId, tx = prisma) {
  if (!categoryId) return true
  const category = await tx.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true },
  })
  return Boolean(category)
}

async function ensureAccountBelongsToUser(accountId, userId, tx = prisma) {
  if (!accountId) return false
  const account = await tx.account.findFirst({
    where: { id: accountId, userId },
    select: { id: true },
  })
  return Boolean(account)
}

export async function listTransactions(req, res, next) {
  try {
    const { type, categoryId, accountId, startDate, endDate, page = 1, limit = 20 } = req.query

    const where = { userId: req.userId }

    if (type) where.type = type
    if (categoryId) where.categoryId = categoryId
    if (accountId) where.accountId = accountId
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    const safePage = Math.max(Number(page) || 1, 1)
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100)

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { category: true, account: true, destinationAccount: true, goal: true },
        orderBy: { date: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      prisma.transaction.count({ where }),
    ])

    return res.json({
      data: transactions,
      meta: { total, page: safePage, limit: safeLimit, pages: Math.ceil(total / safeLimit) },
    })
  } catch (error) {
    next(error)
  }
}

export async function createTransaction(req, res, next) {
  try {
    const { type, amount, description, date, categoryId, accountId, destinationAccountId, goalId } = req.body

    if (!type || !amount || !description || !date) {
      return res.status(400).json({ error: 'Campos obrigatórios: type, amount, description, date' })
    }

    if (!VALID_TRANSACTION_TYPES.has(type)) {
      return res.status(400).json({ error: 'Tipo de lançamento inválido' })
    }

    const val = Number(amount)
    if (val <= 0) {
      return res.status(400).json({ error: 'Valor deve ser maior que zero' })
    }

    // Validar contas com base no tipo de transação
    if (type === 'TRANSFER') {
      if (!accountId || !destinationAccountId) {
        return res.status(400).json({ error: 'Transferências exigem conta de origem e destino' })
      }
      if (accountId === destinationAccountId) {
        return res.status(400).json({ error: 'As contas de origem e destino devem ser diferentes' })
      }
      const originValid = await ensureAccountBelongsToUser(accountId, req.userId)
      const destValid = await ensureAccountBelongsToUser(destinationAccountId, req.userId)
      if (!originValid || !destValid) {
        return res.status(400).json({ error: 'Contas inválidas para este usuário' })
      }
    } else {
      if (!accountId) {
        return res.status(400).json({ error: 'Conta é obrigatória' })
      }
      const accountValid = await ensureAccountBelongsToUser(accountId, req.userId)
      if (!accountValid) {
        return res.status(400).json({ error: 'Conta inválida para este usuário' })
      }
    }

    if (categoryId && !(await ensureCategoryBelongsToUser(categoryId, req.userId))) {
      return res.status(400).json({ error: 'Categoria inválida para este usuário' })
    }

    if (type === 'EXPENSE' && goalId) {
      const goalExists = await prisma.goal.findFirst({
        where: { id: goalId, userId: req.userId }
      })
      if (!goalExists) {
        return res.status(400).json({ error: 'Objetivo inválido para este usuário' })
      }
    }

    // Executar criação e atualização de saldos em transação
    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          type,
          amount: val,
          description: description.trim(),
          date: new Date(date),
          categoryId: type === 'TRANSFER' ? null : (categoryId || null),
          accountId,
          destinationAccountId: type === 'TRANSFER' ? destinationAccountId : null,
          goalId: type === 'EXPENSE' ? (goalId || null) : null,
          userId: req.userId,
        },
        include: { category: true, account: true, destinationAccount: true, goal: true },
      })

      // Atualizar saldos
      if (type === 'INCOME') {
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { increment: val } },
        })
      } else if (type === 'EXPENSE') {
        const acc = await tx.account.findUnique({ where: { id: accountId } })
        await tx.account.update({
          where: { id: accountId },
          data: {
            balance: { decrement: val },
            invoicePaid: acc.type === 'CREDIT_CARD' ? false : undefined
          },
        })

        // Atualizar saldo da meta se aplicável
        if (goalId) {
          await tx.goal.update({
            where: { id: goalId },
            data: { currentAmount: { increment: val } }
          })
        }
      } else if (type === 'TRANSFER') {
        const originAcc = await tx.account.findUnique({ where: { id: accountId } })
        await tx.account.update({
          where: { id: accountId },
          data: {
            balance: { decrement: val },
            invoicePaid: originAcc.type === 'CREDIT_CARD' ? false : undefined
          },
        })
        await tx.account.update({
          where: { id: destinationAccountId },
          data: { balance: { increment: val } },
        })
      }

      return created
    })

    return res.status(201).json(transaction)
  } catch (error) {
    next(error)
  }
}

export async function updateTransaction(req, res, next) {
  try {
    const { id } = req.params
    const { type, amount, description, date, categoryId, accountId, destinationAccountId, goalId } = req.body

    const txExists = await prisma.transaction.findFirst({
      where: { id, userId: req.userId }
    })

    if (!txExists) {
      return res.status(404).json({ error: 'Lançamento não encontrado' })
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Reverter saldo do estado anterior
      const oldVal = Number(txExists.amount)
      if (txExists.type === 'INCOME') {
        await tx.account.update({
          where: { id: txExists.accountId },
          data: { balance: { decrement: oldVal } },
        })
      } else if (txExists.type === 'EXPENSE') {
        await tx.account.update({
          where: { id: txExists.accountId },
          data: { balance: { increment: oldVal } },
        })

        // Reverter saldo da meta anterior
        if (txExists.goalId) {
          await tx.goal.update({
            where: { id: txExists.goalId },
            data: { currentAmount: { decrement: oldVal } }
          })
        }
      } else if (txExists.type === 'TRANSFER') {
        await tx.account.update({
          where: { id: txExists.accountId },
          data: { balance: { increment: oldVal } },
        })
        if (txExists.destinationAccountId) {
          await tx.account.update({
            where: { id: txExists.destinationAccountId },
            data: { balance: { decrement: oldVal } },
          })
        }
      }

      // 2. Preparar valores atualizados
      const merged = {
        type: type !== undefined ? type : txExists.type,
        amount: amount !== undefined ? Number(amount) : Number(txExists.amount),
        accountId: accountId !== undefined ? accountId : txExists.accountId,
        destinationAccountId: destinationAccountId !== undefined ? destinationAccountId : txExists.destinationAccountId,
        description: description !== undefined ? description.trim() : txExists.description,
        date: date !== undefined ? new Date(date) : txExists.date,
        categoryId: categoryId !== undefined ? (categoryId || null) : txExists.categoryId,
        goalId: goalId !== undefined ? (goalId || null) : txExists.goalId
      }

      // Validar dados mesclados
      if (!VALID_TRANSACTION_TYPES.has(merged.type)) {
        throw new Error('INVALID_TYPE')
      }
      if (merged.amount <= 0) {
        throw new Error('INVALID_AMOUNT')
      }

      if (merged.type === 'TRANSFER') {
        if (!merged.accountId || !merged.destinationAccountId) {
          throw new Error('TRANSFER_ACCOUNTS_REQUIRED')
        }
        if (merged.accountId === merged.destinationAccountId) {
          throw new Error('TRANSFER_SAME_ACCOUNTS')
        }
        const originValid = await ensureAccountBelongsToUser(merged.accountId, req.userId, tx)
        const destValid = await ensureAccountBelongsToUser(merged.destinationAccountId, req.userId, tx)
        if (!originValid || !destValid) {
          throw new Error('INVALID_ACCOUNTS')
        }
        merged.categoryId = null
        merged.goalId = null
      } else {
        if (!merged.accountId) {
          throw new Error('ACCOUNT_REQUIRED')
        }
        const accountValid = await ensureAccountBelongsToUser(merged.accountId, req.userId, tx)
        if (!accountValid) {
          throw new Error('INVALID_ACCOUNT')
        }
        merged.destinationAccountId = null

        if (merged.type !== 'EXPENSE') {
          merged.goalId = null
        }
      }

      if (merged.categoryId && !(await ensureCategoryBelongsToUser(merged.categoryId, req.userId, tx))) {
        throw new Error('INVALID_CATEGORY')
      }

      if (merged.goalId) {
        const goalExists = await tx.goal.findFirst({
          where: { id: merged.goalId, userId: req.userId }
        })
        if (!goalExists) {
          throw new Error('INVALID_GOAL')
        }
      }

      // 3. Aplicar saldos atualizados
      const newVal = merged.amount
      if (merged.type === 'INCOME') {
        await tx.account.update({
          where: { id: merged.accountId },
          data: { balance: { increment: newVal } },
        })
      } else if (merged.type === 'EXPENSE') {
        const acc = await tx.account.findUnique({ where: { id: merged.accountId } })
        await tx.account.update({
          where: { id: merged.accountId },
          data: {
            balance: { decrement: newVal },
            invoicePaid: acc.type === 'CREDIT_CARD' ? false : undefined
          },
        })

        // Aplicar saldo na nova meta
        if (merged.goalId) {
          await tx.goal.update({
            where: { id: merged.goalId },
            data: { currentAmount: { increment: newVal } }
          })
        }
      } else if (merged.type === 'TRANSFER') {
        const originAcc = await tx.account.findUnique({ where: { id: merged.accountId } })
        await tx.account.update({
          where: { id: merged.accountId },
          data: {
            balance: { decrement: newVal },
            invoicePaid: originAcc.type === 'CREDIT_CARD' ? false : undefined
          },
        })
        await tx.account.update({
          where: { id: merged.destinationAccountId },
          data: { balance: { increment: newVal } },
        })
      }

      // 4. Salvar no banco
      return tx.transaction.update({
        where: { id },
        data: merged,
        include: { category: true, account: true, destinationAccount: true, goal: true },
      })
    })

    return res.json(updated)
  } catch (error) {
    if (error.message === 'INVALID_TYPE') {
      return res.status(400).json({ error: 'Tipo de lançamento inválido' })
    }
    if (error.message === 'INVALID_AMOUNT') {
      return res.status(400).json({ error: 'Valor deve ser maior que zero' })
    }
    if (error.message === 'TRANSFER_ACCOUNTS_REQUIRED') {
      return res.status(400).json({ error: 'Transferências exigem conta de origem e destino' })
    }
    if (error.message === 'TRANSFER_SAME_ACCOUNTS') {
      return res.status(400).json({ error: 'A conta de origem e destino devem ser diferentes' })
    }
    if (error.message === 'INVALID_ACCOUNTS' || error.message === 'INVALID_ACCOUNT' || error.message === 'ACCOUNT_REQUIRED') {
      return res.status(400).json({ error: 'Conta inválida para este usuário' })
    }
    if (error.message === 'INVALID_CATEGORY') {
      return res.status(400).json({ error: 'Categoria inválida para este usuário' })
    }
    if (error.message === 'INVALID_GOAL') {
      return res.status(400).json({ error: 'Objetivo inválido para este usuário' })
    }
    next(error)
  }
}

export async function deleteTransaction(req, res, next) {
  try {
    const { id } = req.params

    const txExists = await prisma.transaction.findFirst({
      where: { id, userId: req.userId }
    })

    if (!txExists) {
      return res.status(404).json({ error: 'Lançamento não encontrado' })
    }

    await prisma.$transaction(async (tx) => {
      const val = Number(txExists.amount)
      
      // Reverter saldos de contas
      if (txExists.type === 'INCOME') {
        await tx.account.update({
          where: { id: txExists.accountId },
          data: { balance: { decrement: val } },
        })
      } else if (txExists.type === 'EXPENSE') {
        await tx.account.update({
          where: { id: txExists.accountId },
          data: { balance: { increment: val } },
        })

        // Reverter saldo da meta
        if (txExists.goalId) {
          await tx.goal.update({
            where: { id: txExists.goalId },
            data: { currentAmount: { decrement: val } }
          })
        }
      } else if (txExists.type === 'TRANSFER') {
        await tx.account.update({
          where: { id: txExists.accountId },
          data: { balance: { increment: val } },
        })
        if (txExists.destinationAccountId) {
          await tx.account.update({
            where: { id: txExists.destinationAccountId },
            data: { balance: { decrement: val } },
          })
        }
      }

      await tx.transaction.delete({
        where: { id }
      })
    })

    return res.status(204).send()
  } catch (error) {
    next(error)
  }
}

export async function getSummary(req, res, next) {
  try {
    const { month, year } = req.query

    const now = new Date()
    const m = Number(month ?? now.getMonth() + 1)
    const y = Number(year ?? now.getFullYear())

    const startDate = new Date(y, m - 1, 1)
    const endDate = new Date(y, m, 0, 23, 59, 59)

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.userId,
        date: { gte: startDate, lte: endDate },
      },
    })

    const income = transactions
      .filter((transaction) => transaction.type === 'INCOME')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0)

    const expense = transactions
      .filter((transaction) => transaction.type === 'EXPENSE')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0)

    return res.json({
      income,
      expense,
      balance: income - expense,
      month: m,
      year: y,
    })
  } catch (error) {
    next(error)
  }
}
