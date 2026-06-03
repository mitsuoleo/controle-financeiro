import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.js'
import {
  listGoals,
  createGoal,
  updateGoal,
  deleteGoal
} from './goals.controller.js'

const router = Router()

router.use(authMiddleware)

router.get('/', listGoals)
router.post('/', createGoal)
router.put('/:id', updateGoal)
router.delete('/:id', deleteGoal)

export default router
