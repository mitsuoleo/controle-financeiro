import prisma from '../../config/db.js'

const VALID_ACCOUNT_TYPES = new Set(['CHECKING', 'SAVINGS', 'INVESTMENT', 'CASH', 'CREDIT_CARD'])

export async function listAccounts(req, res, next) {
  try {
    const accounts = await prisma.account.findMany({
      where: { userId: req.userId },
      orderBy: { name: 'asc' }
    })
    return res.json(accounts)
  } catch (error) {
    next(error)
  }
}

export async function createAccount(req, res, next) {
  try {
    const { name, type = 'CHECKING', color = '#6366f1', balance = 0, creditLimit } = req.body

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Nome da conta é obrigatório' })
    }

    if (!VALID_ACCOUNT_TYPES.has(type)) {
      return res.status(400).json({ error: 'Tipo de conta inválido' })
    }

    let initialBalance = Number(balance) || 0
    let limitVal = null

    if (type === 'CREDIT_CARD') {
      if (creditLimit === undefined || creditLimit === null || Number(creditLimit) <= 0) {
        return res.status(400).json({ error: 'Limite do cartão é obrigatório e deve ser maior que zero' })
      }
      limitVal = Number(creditLimit)
      initialBalance = 0.00 // Cartão de crédito inicia com saldo/dívida em zero
    }

    const account = await prisma.account.create({
      data: {
        name: name.trim(),
        type,
        color,
        balance: initialBalance,
        creditLimit: limitVal,
        invoicePaid: true,
        userId: req.userId
      }
    })

    return res.status(201).json(account)
  } catch (error) {
    next(error)
  }
}

export async function updateAccount(req, res, next) {
  try {
    const { id } = req.params
    const { name, type, color, creditLimit } = req.body

    const account = await prisma.account.findFirst({
      where: { id, userId: req.userId }
    })

    if (!account) {
      return res.status(404).json({ error: 'Conta não encontrada' })
    }

    if (name !== undefined && !name?.trim()) {
      return res.status(400).json({ error: 'Nome da conta é obrigatório' })
    }

    if (type !== undefined && !VALID_ACCOUNT_TYPES.has(type)) {
      return res.status(400).json({ error: 'Tipo de conta inválido' })
    }

    let limitVal = undefined
    let invoicePaidVal = undefined

    if (creditLimit !== undefined && creditLimit !== null) {
      if (account.type !== 'CREDIT_CARD' && type !== 'CREDIT_CARD') {
        return res.status(400).json({ error: 'Apenas contas de cartão de crédito possuem limite' })
      }

      // Validar regra: só pode alterar limite se a fatura atual/anterior estiver paga
      if (!account.invoicePaid) {
        return res.status(400).json({ error: 'Você só pode alterar o limite se a fatura anterior estiver paga' })
      }

      limitVal = Number(creditLimit)
      if (limitVal <= 0) {
        return res.status(400).json({ error: 'Limite do cartão deve ser maior que zero' })
      }
      
      // Assim que altera o limite, bloqueia alterações futuras até pagar a próxima fatura
      invoicePaidVal = false
    }

    const updated = await prisma.account.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        type,
        color,
        creditLimit: limitVal,
        invoicePaid: invoicePaidVal
      }
    })

    return res.json(updated)
  } catch (error) {
    next(error)
  }
}

export async function deleteAccount(req, res, next) {
  try {
    const { id } = req.params

    const account = await prisma.account.findFirst({
      where: { id, userId: req.userId }
    })

    if (!account) {
      return res.status(404).json({ error: 'Conta não encontrada' })
    }

    const count = await prisma.account.count({
      where: { userId: req.userId }
    })

    if (count <= 1) {
      return res.status(400).json({ error: 'Você precisa manter pelo menos uma conta ativa' })
    }

    await prisma.account.delete({
      where: { id }
    })

    return res.status(204).send()
  } catch (error) {
    next(error)
  }
}

export async function payInvoice(req, res, next) {
  try {
    const { id } = req.params
    const { originAccountId } = req.body

    const account = await prisma.account.findFirst({
      where: { id, userId: req.userId }
    })

    if (!account) {
      return res.status(404).json({ error: 'Conta não encontrada' })
    }

    if (account.type !== 'CREDIT_CARD') {
      return res.status(400).json({ error: 'Apenas faturas de cartão de crédito podem ser pagas' })
    }

    const debt = Math.abs(Number(account.balance))

    if (originAccountId && debt > 0) {
      const originAccount = await prisma.account.findFirst({
        where: { id: originAccountId, userId: req.userId }
      })
      if (!originAccount) {
        return res.status(400).json({ error: 'Conta de origem inválida' })
      }

      await prisma.$transaction(async (tx) => {
        // Criar transação de transferência
        await tx.transaction.create({
          data: {
            userId: req.userId,
            type: 'TRANSFER',
            amount: debt,
            description: `Pagamento de fatura - ${account.name}`,
            date: new Date(),
            accountId: originAccountId,
            destinationAccountId: account.id,
          }
        })

        // Atualizar saldos
        await tx.account.update({
          where: { id: originAccountId },
          data: { balance: { decrement: debt } }
        })

        await tx.account.update({
          where: { id: account.id },
          data: {
            balance: 0.00,
            invoicePaid: true
          }
        })
      })
    } else {
      // Apenas marcar como pago e resetar saldo
      await prisma.account.update({
        where: { id: account.id },
        data: {
          balance: 0.00,
          invoicePaid: true
        }
      })
    }

    return res.json({ message: 'Fatura paga com sucesso' })
  } catch (error) {
    next(error)
  }
}
