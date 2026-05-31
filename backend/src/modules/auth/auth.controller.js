import bcrypt from 'bcryptjs'
import prisma from '../../config/db.js'
import { generateToken } from '../../utils/jwt.js'

export async function register(req, res) {
  const { name, email, password } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Preencha todos os campos.' })
  }

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) {
    return res.status(409).json({ error: 'E-mail já cadastrado.' })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: { id: true, name: true, email: true, createdAt: true },
  })

  const token = generateToken(user.id)

  return res.status(201).json({ user, token })
}

export async function login(req, res) {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Preencha todos os campos.' })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas.' })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return res.status(401).json({ error: 'Credenciais inválidas.' })
  }

  const token = generateToken(user.id)
  const { passwordHash: _, ...safeUser } = user

  return res.json({ user: safeUser, token })
}

export async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, email: true, createdAt: true },
  })

  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' })

  return res.json(user)
}
