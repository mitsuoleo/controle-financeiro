import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { MonthlyBarChart } from '../components/charts/BarChart'
import { Button } from '../components/ui/Button'
import { api } from '../services/api'
import { formatRemainingTimeShort } from '../utils/labels'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const monthsList = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

function StatCard({ label, value, tone }) {
  const toneBg = 
    tone === 'green' 
      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:border-emerald-500/40 hover:shadow-emerald-950/20' 
      : tone === 'red' 
        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:border-rose-500/40 hover:shadow-rose-950/20' 
        : 'bg-slate-900 border-slate-800 text-slate-100 hover:border-slate-700 hover:shadow-slate-950/40'

  return (
    <article className={`rounded-xl border p-6 backdrop-blur-md shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${toneBg}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <strong className="mt-3 block text-3xl font-extrabold tracking-tight">{currency.format(value)}</strong>
    </article>
  )
}

export default function Dashboard() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 })
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      try {
        const [
          { data: summaryData },
          { data: transactionsData },
          { data: categoriesData },
          { data: accountsData },
          { data: goalsData }
        ] = await Promise.all([
          api.get('/transactions/summary', { params: { month, year } }),
          api.get('/transactions', { params: { limit: 100 } }),
          api.get('/categories'),
          api.get('/accounts'),
          api.get('/goals'),
        ])
        setSummary(summaryData)
        setTransactions(transactionsData.data)
        setCategories(categoriesData)
        setAccounts(accountsData)
        setGoals(goalsData)
      } catch (err) {
        console.error('Não foi possível carregar o dashboard', err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [month, year])

  function handlePrevMonth() {
    setMonth((prev) => {
      if (prev === 1) {
        setYear((y) => y - 1)
        return 12
      }
      return prev - 1
    })
  }

  function handleNextMonth() {
    setMonth((prev) => {
      if (prev === 12) {
        setYear((y) => y + 1)
        return 1
      }
      return prev + 1
    })
  }

  const chartData = useMemo(() => {
    const byMonth = new Map()

    const sortedTxs = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date))
    sortedTxs.forEach((transaction) => {
      const date = new Date(transaction.date)
      const key = date.toLocaleDateString('pt-BR', { month: 'short' })
      const entry = byMonth.get(key) ?? { name: key, receitas: 0, despesas: 0 }

      if (transaction.type === 'INCOME') entry.receitas += Number(transaction.amount)
      if (transaction.type === 'EXPENSE') entry.despesas += Number(transaction.amount)

      byMonth.set(key, entry)
    })

    return Array.from(byMonth.values()).slice(-6)
  }, [transactions])

  const filteredTransactionsForMonth = useMemo(() => {
    return transactions.filter((transaction) => {
      const date = new Date(transaction.date)
      return date.getFullYear() === year && (date.getMonth() + 1) === month
    })
  }, [transactions, month, year])

  const categoryData = useMemo(() => {
    const byCategory = new Map()

    filteredTransactionsForMonth
      .filter((transaction) => transaction.type === 'EXPENSE')
      .forEach((transaction) => {
        const name = transaction.category?.name ?? 'Sem categoria'
        const color = transaction.category?.color ?? '#64748b'
        const existing = byCategory.get(name) ?? { value: 0, color }
        byCategory.set(name, { value: existing.value + Number(transaction.amount), color })
      })

    return Array.from(byCategory.entries()).map(([name, { value, color }]) => ({ name, value, color }))
  }, [filteredTransactionsForMonth])

  const budgetProgress = useMemo(() => {
    return categories
      .filter((cat) => (cat.type === 'EXPENSE' || cat.type === 'BOTH') && cat.maxLimit !== null && cat.maxLimit !== undefined)
      .map((cat) => {
        const spent = filteredTransactionsForMonth
          .filter((tx) => tx.type === 'EXPENSE' && tx.categoryId === cat.id)
          .reduce((sum, tx) => sum + Number(tx.amount), 0)

        const limit = Number(cat.maxLimit)
        const percent = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0

        return {
          id: cat.id,
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
          spent,
          limit,
          percent,
        }
      })
  }, [categories, filteredTransactionsForMonth])

  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + Number(acc.balance), 0)
  }, [accounts])

  const exceededBudgets = useMemo(() => {
    return budgetProgress.filter((b) => b.spent > b.limit)
  }, [budgetProgress])

  const closestGoals = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return [...goals]
      .map(goal => {
        const deadline = new Date(goal.deadline)
        deadline.setHours(0, 0, 0, 0)
        const diffTime = deadline.getTime() - today.getTime()
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return { ...goal, daysLeft }
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 3)
  }, [goals])

  const accountTypeLabels = {
    CHECKING: 'Conta Corrente',
    SAVINGS: 'Poupança',
    INVESTMENT: 'Investimento',
    CASH: 'Dinheiro',
    CREDIT_CARD: 'Cartão de Crédito',
  }

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p className="text-sm text-slate-400 font-medium">Carregando dashboard...</p>
      </div>
    )
  }

  return (
    <div className="grid gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Dashboard</h1>
          <p className="mt-1.5 text-sm text-slate-400">Resumo financeiro e análise de desempenho</p>
        </div>

        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-1.5 rounded-lg shadow-inner self-start">
          <Button variant="secondary" className="h-8 w-8 !p-0 !min-w-0" onClick={handlePrevMonth}>
            &larr;
          </Button>
          <span className="text-sm font-bold text-white px-3 min-w-[120px] text-center select-none">
            {monthsList[month - 1]} de {year}
          </span>
          <Button variant="secondary" className="h-8 w-8 !p-0 !min-w-0" onClick={handleNextMonth}>
            &rarr;
          </Button>
        </div>
      </div>

      {exceededBudgets.length > 0 && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-start gap-3">
            <span className="text-2xl animate-bounce">⚠️</span>
            <div className="grid gap-1">
              <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider">Alertas de Limite Excedido</h3>
              <p className="text-xs text-rose-300">Você ultrapassou o orçamento estipulado para as seguintes categorias:</p>
              <ul className="mt-2.5 grid gap-1.5 pl-4 list-disc text-xs text-rose-200/90 font-medium">
                {exceededBudgets.map((b) => (
                  <li key={b.id}>
                    <strong>{b.name}</strong>: gastou{' '}
                    <span className="font-semibold">{currency.format(b.spent)}</span>{' '}
                    de{' '}
                    <span className="font-semibold">{currency.format(b.limit)}</span>{' '}
                    (Excesso de <span className="font-bold text-rose-400">{currency.format(b.spent - b.limit)}</span>)
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <section className="grid gap-5 md:grid-cols-3">
        <StatCard label="Saldo Geral" value={totalBalance} />
        <StatCard label="Receitas do Mês" value={summary.income} tone="green" />
        <StatCard label="Despesas do Mês" value={summary.expense} tone="red" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <article className="rounded-xl border border-slate-800/80 bg-slate-900 p-6 shadow-xl transition-all hover:border-slate-700/50">
          <h2 className="text-lg font-bold text-white tracking-tight">Evolução Mensal (Receitas x Despesas)</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">Comparativo histórico dos últimos meses lançados</p>
          <div className="mt-4">
            <MonthlyBarChart data={chartData} />
          </div>
        </article>

        <article className="rounded-xl border border-slate-800/80 bg-slate-900 p-6 shadow-xl transition-all hover:border-slate-700/50">
          <h2 className="text-lg font-bold text-white tracking-tight">Distribuição por Categoria</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">Despesas do mês selecionado por categoria</p>
          <div className="mt-4 h-[280px]">
            {categoryData.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
                <span className="text-3xl">📭</span>
                <p className="text-sm">Sem despesas neste período.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                    {categoryData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                    itemStyle={{ color: '#f8fafc' }}
                    formatter={(value) => currency.format(value)} 
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-slate-800/80 bg-slate-900 p-6 shadow-xl transition-all hover:border-slate-700/50">
          <h2 className="text-lg font-bold text-white tracking-tight">Minhas Contas</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">Saldos atuais em suas carteiras e contas</p>
          
          <div className="grid gap-4">
            {accounts.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-500">
                <span className="text-3xl">🏦</span>
                <p className="text-sm">Nenhuma conta encontrada</p>
              </div>
            ) : (
              accounts.map((acc) => {
                const val = Number(acc.balance)
                return (
                  <div key={acc.id} className="flex items-center justify-between border-b border-slate-800/60 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2.5">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: acc.color }} />
                      <div className="grid gap-0.5">
                        <span className="font-semibold text-sm text-slate-200 line-clamp-1">{acc.name}</span>
                        <span className="text-xs text-slate-400">{accountTypeLabels[acc.type]}</span>
                      </div>
                    </div>
                    <span className="font-mono text-right text-xs">
                      {acc.type === 'CREDIT_CARD' ? (
                        <div className="grid gap-0.5 text-right">
                          <span className="text-rose-400 font-bold">
                            Fatura: {currency.format(Math.abs(val))}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            de {currency.format(Number(acc.creditLimit))}
                          </span>
                        </div>
                      ) : (
                        <span className={`text-sm font-bold ${val >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {currency.format(val)}
                        </span>
                      )}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </article>

        <article className="rounded-xl border border-slate-800/80 bg-slate-900 p-6 shadow-xl transition-all hover:border-slate-700/50">
          <h2 className="text-lg font-bold text-white tracking-tight">Orçamentos do Mês</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">Acompanhamento de limites de gastos por categoria</p>
          
          <div className="grid gap-5">
            {budgetProgress.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-500">
                <span className="text-3xl">🎯</span>
                <p className="text-sm">Nenhum limite definido para este período</p>
              </div>
            ) : (
              budgetProgress.map((budget) => {
                const barColor = 
                  budget.percent >= 100 
                    ? 'bg-rose-600' 
                    : budget.percent >= 85 
                      ? 'bg-orange-500' 
                      : budget.percent >= 70 
                        ? 'bg-amber-500' 
                        : 'bg-emerald-500'
                
                const textColor = 
                  budget.percent >= 100 
                    ? 'text-rose-400' 
                    : budget.percent >= 85 
                      ? 'text-orange-400' 
                      : budget.percent >= 70 
                        ? 'text-amber-400' 
                        : 'text-emerald-400'

                return (
                  <div key={budget.id} className="grid gap-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-semibold text-slate-200">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: budget.color }} />
                        {budget.name}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        <span className={`font-semibold ${textColor}`}>{currency.format(budget.spent)}</span>
                        {' de '}
                        {currency.format(budget.limit)}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/50">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`} 
                        style={{ width: `${budget.percent}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </article>

        <article className="rounded-xl border border-slate-800/80 bg-slate-900 p-6 shadow-xl transition-all hover:border-slate-700/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-white tracking-tight">Metas de Economia</h2>
              <Link to="/goals" className="text-xs text-emerald-400 font-bold hover:text-emerald-300 transition-colors">
                Ver todos &rarr;
              </Link>
            </div>
            <p className="text-xs text-slate-400 mb-6">Objetivos mais próximos do prazo final</p>
            
            <div className="grid gap-5">
              {closestGoals.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-500">
                  <span className="text-3xl">🎯</span>
                  <p className="text-sm text-center">Nenhum objetivo ativo</p>
                </div>
              ) : (
                closestGoals.map((goal) => {
                  const target = Number(goal.targetAmount)
                  const current = Number(goal.currentAmount)
                  const percent = target > 0 ? Math.min((current / target) * 100, 100) : 0
                  
                  const barColor = 
                    percent >= 100 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                      : percent >= 50 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500' 
                        : 'bg-gradient-to-r from-amber-500 to-orange-500'
                  
                  return (
                    <div key={goal.id} className="grid gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-200 line-clamp-1" title={goal.name}>
                          {goal.name}
                        </span>
                        <span className="text-[10px] font-bold font-mono">
                          <span className={goal.daysLeft > 0 ? 'text-emerald-400' : goal.daysLeft === 0 ? 'text-amber-400' : 'text-rose-400'}>
                            {formatRemainingTimeShort(goal.daysLeft)}
                          </span>
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/50 p-0.5">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`} 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>{currency.format(current)}</span>
                        <span>{percent.toFixed(0)}%</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
          {closestGoals.length > 0 && (
            <div className="mt-5 pt-3 border-t border-slate-800/60 text-center">
              <Link to="/goals">
                <Button variant="secondary" className="w-full text-xs h-8">
                  Ir para Objetivos
                </Button>
              </Link>
            </div>
          )}
        </article>

        <article className="rounded-xl border border-slate-800/80 bg-slate-900 p-6 shadow-xl transition-all hover:border-slate-700/50">
          <h2 className="text-lg font-bold text-white tracking-tight">Últimos Lançamentos</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">Atividades financeiras recentes em sua conta</p>
          
          <div className="grid gap-4">
            {transactions.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-500">
                <span className="text-3xl">💸</span>
                <p className="text-sm">Nenhum lançamento registrado</p>
              </div>
            ) : (
              transactions.slice(0, 5).map((tx) => {
                const isIncome = tx.type === 'INCOME'
                const isTransfer = tx.type === 'TRANSFER'
                const valueColor = isIncome 
                  ? 'text-emerald-400' 
                  : isTransfer 
                    ? 'text-blue-400' 
                    : 'text-rose-400'
                const valuePrefix = isIncome ? '+' : isTransfer ? '' : '-'

                return (
                  <div key={tx.id} className="flex items-center justify-between border-b border-slate-800/60 pb-3 last:border-0 last:pb-0">
                    <div className="grid gap-0.5 col-span-2">
                      <span className="font-semibold text-sm text-slate-200 line-clamp-1">{tx.description}</span>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{new Date(tx.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tx.category?.color ?? '#64748b' }} />
                          {tx.category?.name ?? 'Sem categoria'}
                        </span>
                      </div>
                    </div>
                    <span className={`font-mono text-sm font-bold text-right ${valueColor}`}>
                      {valuePrefix} {currency.format(Number(tx.amount))}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </article>
      </section>
    </div>
  )
}
