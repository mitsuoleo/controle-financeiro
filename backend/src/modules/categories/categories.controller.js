import prisma from '../../config/db.js'

export async function listCategories(req, res) {
  const categories = await prisma.category.findMany({
    where: { userId: req.userId },
    orderBy: { name: 'asc' },
  })
  return res.json(categories)
}

export async function createCategory(req, res) {
  const { name, color, icon, type } = req.body

  if (!name) return res.status(400).json({ error: 'Nome obrigatório.' })

  const category = await prisma.category.create({
    data: { name, color, icon, type, userId: req.userId },
  })

  return res.status(201).json(category)
}

export async function updateCategory(req, res) {
  const { id } = req.params
  const { name, color, icon, type } = req.body

  const category = await prisma.category.findFirst({
    where: { id, userId: req.userId },
  })
  if (!category) return res.status(404).json({ error: 'Categoria não encontrada.' })

  const updated = await prisma.category.update({
    where: { id },
    data: { name, color, icon, type },
  })

  return res.json(updated)
}

export async function deleteCategory(req, res) {
  const { id } = req.params

  const category = await prisma.category.findFirst({
    where: { id, userId: req.userId },
  })
  if (!category) return res.status(404).json({ error: 'Categoria não encontrada.' })

  await prisma.category.delete({ where: { id } })

  return res.status(204).send()
}
