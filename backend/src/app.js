import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import { getCorsOptions } from './config/cors.js'
import authRoutes from './modules/auth/auth.routes.js'
import categoriesRoutes from './modules/categories/categories.routes.js'
import transactionsRoutes from './modules/transactions/transactions.routes.js'
import accountsRoutes from './modules/accounts/accounts.routes.js'
import recurringTransactionsRoutes from './modules/recurring-transactions/recurring-transactions.routes.js'
import { processRecurringTransactions } from './services/recurring.service.js'

const app = express()

app.use(cors(getCorsOptions()))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/transactions', transactionsRoutes)
app.use('/api/accounts', accountsRoutes)
app.use('/api/recurring-transactions', recurringTransactionsRoutes)

app.get('/health', (_, res) => res.json({ status: 'ok' }))

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor' })
})

const PORT = process.env.PORT ?? 3333
app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`)
  
  // Executar checagem inicial de recorrências na inicialização
  processRecurringTransactions().catch((err) => {
    console.error('[Sistema] Erro na checagem inicial de recorrências:', err)
  })

  // Agendar verificação automática em segundo plano a cada 12 horas
  const TWELVE_HOURS = 12 * 60 * 60 * 1000
  setInterval(() => {
    console.log('[Sistema] Executando verificação de lançamentos recorrentes em segundo plano...')
    processRecurringTransactions().catch((err) => {
      console.error('[Sistema] Erro na checagem em segundo plano de recorrências:', err)
    })
  }, TWELVE_HOURS)
})
