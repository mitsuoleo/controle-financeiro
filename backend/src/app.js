import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import { getCorsOptions } from './config/cors.js'
import authRoutes from './modules/auth/auth.routes.js'
import categoriesRoutes from './modules/categories/categories.routes.js'
import transactionsRoutes from './modules/transactions/transactions.routes.js'

const app = express()

app.use(cors(getCorsOptions()))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/transactions', transactionsRoutes)

app.get('/health', (_, res) => res.json({ status: 'ok' }))

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor.' })
})

const PORT = process.env.PORT ?? 3333
app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`)
})
