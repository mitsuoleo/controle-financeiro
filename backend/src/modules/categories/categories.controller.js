import prisma from '../../config/db.js'

const VALID_CATEGORY_TYPES = new Set(['INCOME', 'EXPENSE', 'BOTH'])

export async function listCategories(req, res) {
  const categories = await prisma.category.findMany({
    where: { userId: req.userId },
    orderBy: { name: 'asc' },
  })

  return res.json(categories)
}

export async function createCategory(req, res) {
  const { name, color = '#6366f1', icon = 'tag', type = 'BOTH', maxLimit } = req.body

  if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatório' })
  if (!VALID_CATEGORY_TYPES.has(type)) return res.status(400).json({ error: 'Tipo de categoria inválido' })

  if (maxLimit !== undefined && maxLimit !== null && maxLimit !== '') {
    const limitNum = Number(maxLimit)
    if (isNaN(limitNum) || limitNum < 0) {
      return res.status(400).json({ error: 'Limite de gastos inválido' })
    }
  }

  const category = await prisma.category.create({
    data: {
      name: name.trim(),
      color,
      icon,
      type,
      maxLimit: maxLimit !== undefined && maxLimit !== null && maxLimit !== '' ? Number(maxLimit) : null,
      userId: req.userId,
    },
  })

  return res.status(201).json(category)
}

export async function updateCategory(req, res) {
  const { id } = req.params
  const { name, color, icon, type, maxLimit } = req.body

  if (name !== undefined && !name?.trim()) return res.status(400).json({ error: 'Nome obrigatório' })
  if (type !== undefined && !VALID_CATEGORY_TYPES.has(type)) {
    return res.status(400).json({ error: 'Tipo de categoria inválido' })
  }

  if (maxLimit !== undefined && maxLimit !== null && maxLimit !== '') {
    const limitNum = Number(maxLimit)
    if (isNaN(limitNum) || limitNum < 0) {
      return res.status(400).json({ error: 'Limite de gastos inválido' })
    }
  }

  const category = await prisma.category.findFirst({
    where: { id, userId: req.userId },
  })
  if (!category) return res.status(404).json({ error: 'Categoria não encontrada' })

  const updated = await prisma.category.update({
    where: { id },
    data: {
      name: name?.trim(),
      color,
      icon,
      type,
      maxLimit: maxLimit !== undefined ? (maxLimit !== null && maxLimit !== '' ? Number(maxLimit) : null) : undefined,
    },
  })

  return res.json(updated)
}

export async function deleteCategory(req, res) {
  const { id } = req.params

  const category = await prisma.category.findFirst({
    where: { id, userId: req.userId },
  })
  if (!category) return res.status(404).json({ error: 'Categoria não encontrada' })

  await prisma.category.delete({ where: { id } })

  return res.status(204).send()
}
