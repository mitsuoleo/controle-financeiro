import prisma from '../../config/db.js'
import { processRecurringTransactions } from '../../services/recurring.service.js'

const VALID_FREQUENCIES = new Set(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'])
const VALID_TRANSACTION_TYPES = new Set(['INCOME', 'EXPENSE', 'TRANSFER'])

async function ensureCategoryBelongsToUser(categoryId, userId) {
  if (!categoryId) return true
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true },
  })
  return Boolean(category)
}

async function ensureAccountBelongsToUser(accountId, userId) {
  if (!accountId) return false
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
    select: { id: true },
  })
  return Boolean(account)
}

export async function listRecurringTransactions(req, res, next) {
  try {
    const recurring = await prisma.recurringTransaction.findMany({
      where: { userId: req.userId },
      include: { category: true, account: true, destinationAccount: true },
      orderBy: { createdAt: 'desc' }
    })
    return res.json(recurring)
  } catch (error) {
    next(error)
  }
}

export async function createRecurringTransaction(req, res, next) {
  try {
    const {
      description,
      amount,
      type,
      frequency,
      startDate,
      endDate,
      categoryId,
      accountId,
      destinationAccountId
    } = req.body

    if (!description?.trim() || !amount || !type || !frequency || !startDate) {
      return res.status(400).json({ error: 'Campos obrigatórios: description, amount, type, frequency, startDate' })
    }

    if (!VALID_TRANSACTION_TYPES.has(type)) {
      return res.status(400).json({ error: 'Tipo de lançamento inválido' })
    }

    if (!VALID_FREQUENCIES.has(frequency)) {
      return res.status(400).json({ error: 'Frequência inválida' })
    }

    const val = Number(amount)
    if (val <= 0) {
      return res.status(400).json({ error: 'Valor deve ser maior que zero' })
    }

    // Validar contas
    if (type === 'TRANSFER') {
      if (!accountId || !destinationAccountId) {
        return res.status(400).json({ error: 'Transferências exigem conta de origem e destino' })
      }
      if (accountId === destinationAccountId) {
        return res.status(400).json({ error: 'A conta de origem e destino devem ser diferentes' })
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

    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : null

    const recurring = await prisma.recurringTransaction.create({
      data: {
        userId: req.userId,
        description: description.trim(),
        amount: val,
        type,
        frequency,
        startDate: start,
        endDate: end,
        nextDueDate: start,
        categoryId: type === 'TRANSFER' ? null : (categoryId || null),
        accountId,
        destinationAccountId: type === 'TRANSFER' ? destinationAccountId : null,
      },
      include: { category: true, account: true, destinationAccount: true }
    })

    // Processar imediatamente para gerar transações retroativas/do próprio dia
    await processRecurringTransactions(req.userId)

    return res.status(201).json(recurring)
  } catch (error) {
    next(error)
  }
}

export async function updateRecurringTransaction(req, res, next) {
  try {
    const { id } = req.params
    const { isActive, description, amount, frequency, endDate } = req.body

    const recurring = await prisma.recurringTransaction.findFirst({
      where: { id, userId: req.userId }
    })

    if (!recurring) {
      return res.status(404).json({ error: 'Agendamento não encontrado' })
    }

    const data = {}
    if (isActive !== undefined) data.isActive = Boolean(isActive)
    if (description !== undefined) data.description = description.trim()
    if (amount !== undefined) {
      const val = Number(amount)
      if (val <= 0) {
        return res.status(400).json({ error: 'Valor deve ser maior que zero' })
      }
      data.amount = val
    }
    if (frequency !== undefined) {
      if (!VALID_FREQUENCIES.has(frequency)) {
        return res.status(400).json({ error: 'Frequência inválida' })
      }
      data.frequency = frequency
    }
    if (endDate !== undefined) {
      data.endDate = endDate ? new Date(endDate) : null
    }

    const updated = await prisma.recurringTransaction.update({
      where: { id },
      data,
      include: { category: true, account: true, destinationAccount: true }
    })

    // Se reativou o agendamento, processar imediatamente
    if (isActive === true) {
      await processRecurringTransactions(req.userId)
    }

    return res.json(updated)
  } catch (error) {
    next(error)
  }
}

export async function deleteRecurringTransaction(req, res, next) {
  try {
    const { id } = req.params

    const recurring = await prisma.recurringTransaction.findFirst({
      where: { id, userId: req.userId }
    })

    if (!recurring) {
      return res.status(404).json({ error: 'Agendamento não encontrado' })
    }

    await prisma.recurringTransaction.delete({
      where: { id }
    })

    return res.status(204).send()
  } catch (error) {
    next(error)
  }
}
