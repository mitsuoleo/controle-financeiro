import { Router } from 'express'
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getSummary,
} from './transactions.controller.js'
import { authMiddleware } from '../../middlewares/auth.js'
import { processRecurringMiddleware } from '../../middlewares/recurring.js'

const router = Router()

router.use(authMiddleware)
router.use(processRecurringMiddleware)

router.get('/', listTransactions)
router.post('/', createTransaction)
router.put('/:id', updateTransaction)
router.delete('/:id', deleteTransaction)
router.get('/summary', getSummary)

export default router
