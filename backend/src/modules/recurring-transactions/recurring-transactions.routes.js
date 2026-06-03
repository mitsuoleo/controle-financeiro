import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.js'
import {
  listRecurringTransactions,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
} from './recurring-transactions.controller.js'

import { processRecurringMiddleware } from '../../middlewares/recurring.js'

const router = Router()

router.use(authMiddleware)
router.use(processRecurringMiddleware)

router.get('/', listRecurringTransactions)
router.post('/', createRecurringTransaction)
router.put('/:id', updateRecurringTransaction)
router.delete('/:id', deleteRecurringTransaction)

export default router
