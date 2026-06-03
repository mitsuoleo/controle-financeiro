import { Router } from 'express'
import { register, login, me } from './auth.controller.js'
import { authMiddleware } from '../../middlewares/auth.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.get('/me', authMiddleware, me)

export default router
