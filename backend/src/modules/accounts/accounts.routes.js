import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.js'
import {
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  payInvoice,
} from './accounts.controller.js'

const router = Router()

router.use(authMiddleware)

router.get('/', listAccounts)
router.post('/', createAccount)
router.put('/:id', updateAccount)
router.delete('/:id', deleteAccount)
router.post('/:id/pay-invoice', payInvoice)

export default router
