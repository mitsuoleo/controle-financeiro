import prisma from '../config/db.js'

function getNextDate(currentDate, frequency) {
  const next = new Date(currentDate)
  switch (frequency) {
    case 'DAILY':
      next.setDate(next.getDate() + 1)
      break
    case 'WEEKLY':
      next.setDate(next.getDate() + 7)
      break
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1)
      break
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1)
      break
  }
  return next
}

export async function processRecurringTransactions(userId = null) {
  const today = new Date()
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0))

  const where = {
    isActive: true,
    nextDueDate: { lte: todayUTC }
  }

  if (userId) {
    where.userId = userId
  }

  const recurringTxs = await prisma.recurringTransaction.findMany({
    where,
    orderBy: { nextDueDate: 'asc' }
  })

  if (recurringTxs.length === 0) return 0

  let generatedCount = 0

  for (const rec of recurringTxs) {
    let currentDueDate = new Date(rec.nextDueDate)
    let active = rec.isActive

    // Usar uma transação para cada recorrência individual para garantir consistência
    await prisma.$transaction(async (tx) => {
      while (currentDueDate <= todayUTC && active) {
        const val = Number(rec.amount)

        // 1. Criar a transação
        await tx.transaction.create({
          data: {
            userId: rec.userId,
            type: rec.type,
            amount: val,
            description: rec.description,
            date: new Date(currentDueDate),
            categoryId: rec.type === 'TRANSFER' ? null : rec.categoryId,
            accountId: rec.accountId,
            destinationAccountId: rec.type === 'TRANSFER' ? rec.destinationAccountId : null,
          }
        })

        // 2. Atualizar saldos das contas correspondentes
        if (rec.accountId) {
          if (rec.type === 'INCOME') {
            await tx.account.update({
              where: { id: rec.accountId },
              data: { balance: { increment: val } }
            })
          } else if (rec.type === 'EXPENSE' || rec.type === 'TRANSFER') {
            await tx.account.update({
              where: { id: rec.accountId },
              data: { balance: { decrement: val } }
            })
          }
        }

        if (rec.type === 'TRANSFER' && rec.destinationAccountId) {
          await tx.account.update({
            where: { id: rec.destinationAccountId },
            data: { balance: { increment: val } }
          })
        }

        generatedCount++

        // 3. Avançar para a próxima data
        const nextDate = getNextDate(currentDueDate, rec.frequency)
        
        if (rec.endDate && nextDate > new Date(rec.endDate)) {
          active = false
        } else {
          currentDueDate = nextDate
        }
      }

      // 4. Atualizar o agendamento no banco
      await tx.recurringTransaction.update({
        where: { id: rec.id },
        data: {
          nextDueDate: currentDueDate,
          isActive: active
        }
      })
    })
  }

  if (generatedCount > 0) {
    console.log(`[Recorrência] Gerados ${generatedCount} lançamentos automáticos.`)
  }

  return generatedCount
}
