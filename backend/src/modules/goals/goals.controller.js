import prisma from '../../config/db.js'

export async function listGoals(req, res, next) {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.userId },
      orderBy: { deadline: 'asc' }
    })
    return res.json(goals)
  } catch (error) {
    next(error)
  }
}

export async function createGoal(req, res, next) {
  try {
    const { name, targetAmount, deadline } = req.body

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Nome do objetivo é obrigatório' })
    }

    const target = Number(targetAmount)
    if (isNaN(target) || target <= 0) {
      return res.status(400).json({ error: 'Valor alvo deve ser maior que zero' })
    }

    if (!deadline) {
      return res.status(400).json({ error: 'Data limite é obrigatória' })
    }

    const dateVal = new Date(deadline)
    if (isNaN(dateVal.getTime())) {
      return res.status(400).json({ error: 'Data limite inválida' })
    }

    const goal = await prisma.goal.create({
      data: {
        name: name.trim(),
        targetAmount: target,
        deadline: dateVal,
        currentAmount: 0.00,
        userId: req.userId
      }
    })

    return res.status(201).json(goal)
  } catch (error) {
    next(error)
  }
}

export async function updateGoal(req, res, next) {
  try {
    const { id } = req.params
    const { name, targetAmount, deadline } = req.body

    const goal = await prisma.goal.findFirst({
      where: { id, userId: req.userId }
    })

    if (!goal) {
      return res.status(404).json({ error: 'Objetivo não encontrado' })
    }

    if (name !== undefined && !name?.trim()) {
      return res.status(400).json({ error: 'Nome do objetivo é obrigatório' })
    }

    let target = undefined
    if (targetAmount !== undefined) {
      target = Number(targetAmount)
      if (isNaN(target) || target <= 0) {
        return res.status(400).json({ error: 'Valor alvo deve ser maior que zero' })
      }
    }

    let dateVal = undefined
    if (deadline !== undefined) {
      if (!deadline) {
        return res.status(400).json({ error: 'Data limite é obrigatória' })
      }
      dateVal = new Date(deadline)
      if (isNaN(dateVal.getTime())) {
        return res.status(400).json({ error: 'Data limite inválida' })
      }
    }

    const updated = await prisma.goal.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        targetAmount: target,
        deadline: dateVal
      }
    })

    return res.json(updated)
  } catch (error) {
    next(error)
  }
}

export async function deleteGoal(req, res, next) {
  try {
    const { id } = req.params

    const goal = await prisma.goal.findFirst({
      where: { id, userId: req.userId }
    })

    if (!goal) {
      return res.status(404).json({ error: 'Objetivo não encontrado' })
    }

    await prisma.goal.delete({
      where: { id }
    })

    return res.status(204).send()
  } catch (error) {
    next(error)
  }
}
