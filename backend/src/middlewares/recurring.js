import { processRecurringTransactions } from '../services/recurring.service.js'

export async function processRecurringMiddleware(req, res, next) {
  if (req.userId) {
    try {
      await processRecurringTransactions(req.userId)
    } catch (error) {
      console.error('[Recorrência] Erro ao processar lançamentos recorrentes:', error)
    }
  }
  next()
}
