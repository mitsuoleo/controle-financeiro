import prisma from '../../config/db.js'

export async function listTransactions(req, res) {
  const { type, categoryId, startDate, endDate, page = 1, limit = 20 } = req.query

  const where = { userId: req.userId }

  if (type) where.type = type
  if (categoryId) where.categoryId = categoryId
  if (startDate || endDate) {
    where.date = {}
    if (startDate) where.date.gte = new Date(startDate)
    if (endDate) where.date.lte = new Date(endDate)
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.transaction.count({ where }),
  ])

  return res.json({
    data: transactions,
    meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
  })
}

export async function createTransaction(req, res) {
  const { type, amount, description, date, categoryId } = req.body

  if (!type || !amount || !description || !date) {
    return res.status(400).json({ error: 'Campos obrigatórios: type, amount, description, date.' })
  }

  const transaction = await prisma.transaction.create({
    data: {
      type,
      amount,
      description,
      date: new Date(date),
      categoryId: categoryId || null,
      userId: req.userId,
    },
    include: { category: true },
  })

  return res.status(201).json(transaction)
}

export async function updateTransaction(req, res) {
  const { id } = req.params
  const { type, amount, description, date, categoryId } = req.body

  const tx = await prisma.transaction.findFirst({ where: { id, userId: req.userId } })
  if (!tx) return res.status(404).json({ error: 'Transação não encontrada.' })

  const updated = await prisma.transaction.update({
    where: { id },
    data: { type, amount, description, date: date ? new Date(date) : undefined, categoryId },
    include: { category: true },
  })

  return res.json(updated)
}

export async function deleteTransaction(req, res) {
  const { id } = req.params

  const tx = await prisma.transaction.findFirst({ where: { id, userId: req.userId } })
  if (!tx) return res.status(404).json({ error: 'Transação não encontrada.' })

  await prisma.transaction.delete({ where: { id } })

  return res.status(204).send()
}

export async function getSummary(req, res) {
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
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const expense = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  return res.json({
    income,
    expense,
    balance: income - expense,
    month: m,
    year: y,
  })
}
