import bcrypt from 'bcryptjs'
import prisma from '../../config/db.js'
import { generateToken } from '../../utils/jwt.js'

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Preencha todos os campos' })
    }

    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()

    if (trimmedName.length < 2) {
      return res.status(400).json({ error: 'O nome deve ter pelo menos 2 caracteres' })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ error: 'Formato de e-mail inválido' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' })
    }

    const exists = await prisma.user.findUnique({ where: { email: trimmedEmail } })
    if (exists) {
      return res.status(409).json({ error: 'E-mail já cadastrado' })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const { user, token } = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: { name: trimmedName, email: trimmedEmail, passwordHash },
        select: { id: true, name: true, email: true, createdAt: true },
      })

      await tx.account.create({
        data: {
          userId: createdUser.id,
          name: 'Carteira',
          type: 'CASH',
          color: '#10b981',
          balance: 0.00
        }
      })

      const generatedToken = generateToken(createdUser.id)
      return { user: createdUser, token: generatedToken }
    })

    return res.status(201).json({ user, token })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'E-mail já cadastrado' })
    }
    next(error)
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Preencha todos os campos' })
    }

    const trimmedEmail = email.trim().toLowerCase()

    const user = await prisma.user.findUnique({ where: { email: trimmedEmail } })
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const token = generateToken(user.id)
    const { passwordHash: _, ...safeUser } = user

    return res.json({ user: safeUser, token })
  } catch (error) {
    next(error)
  }
}

export async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, email: true, createdAt: true },
  })

  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })

  return res.json(user)
}
