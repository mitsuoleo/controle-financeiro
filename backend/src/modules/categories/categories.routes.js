import { Router } from 'express'
import { listCategories, createCategory, updateCategory, deleteCategory } from './categories.controller.js'
import { authMiddleware } from '../../middlewares/auth.js'

const router = Router()

router.use(authMiddleware)

router.get('/', listCategories)
router.post('/', createCategory)
router.put('/:id', updateCategory)
router.delete('/:id', deleteCategory)

export default router
