import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { MonthlyBarChart } from '../components/charts/BarChart'
import { Button } from '../components/ui/Button'
import { api } from '../services/api'
import { formatRemainingTimeShort, formatDateShort } from '../utils/labels'
import { useQuickAddStore } from '../store/quickAddStore'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const monthsList = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

function StatCard({ label, value, tone }) {
  const toneBg = 
    tone === 'green' 
      ? 'bg-emerald-50/50 border-emerald-100 text-emerald-600 hover:border-emerald-200 shadow-sm' 
      : tone === 'red' 
        ? 'bg-rose-50/50 border-rose-100 text-rose-600 hover:border-rose-200 shadow-sm' 
        : 'bg-white border-pink-100 text-slate-800 hover:border-pink-200 shadow-sm'

  return (
    <article className={`rounded-2xl border p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${toneBg}`}>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <strong className="mt-3 block text-3xl font-extrabold tracking-tight font-sans text-slate-800">{currency.format(value)}</strong>
    </article>
  )
}

export default function Dashboard() {
  const { open: openQuickAdd } = useQuickAddStore()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 })
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  async function loadDashboard(silent = false) {
    if (!silent) setLoading(true)
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
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard(false)
  }, [month, year])

  useEffect(() => {
    const handleSave = () => {
      loadDashboard(true) // silent refresh in background
    }
    window.addEventListener('transaction-saved', handleSave)
    return () => window.removeEventListener('transaction-saved', handleSave)
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
        <p className="text-sm text-slate-400 font-bold">Carregando dashboard...</p>
      </div>
    )
  }

  return (
    <div className="grid gap-8">
      {/* Header com Porquinho e Moeda */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-pink-100/50 pb-6">
        <div className="flex items-center gap-4">
          <svg className="w-14 h-14 text-pink-400 drop-shadow-sm shrink-0" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M48 38C48 44.6274 41.2843 50 33 50C24.7157 50 18 44.6274 18 38C18 31.3726 24.7157 26 33 26C41.2843 26 48 31.3726 48 38Z" fill="#F472B6" />
            <path d="M22 27L16 20L23 23Z" fill="#DB2777" />
            <path d="M50 37C50 39.2091 48.8807 41 47.5 41C46.1193 41 45 39.2091 45 37C45 34.7909 46.1193 33 47.5 33C48.8807 33 50 34.7909 50 37Z" fill="#DB2777" />
            <circle cx="38" cy="33" r="2" fill="#3D2E32" />
            <rect x="23" y="48" width="5" height="6" rx="2.5" fill="#DB2777" />
            <rect x="38" y="48" width="5" height="6" rx="2.5" fill="#DB2777" />
            <path d="M18 38C16 38 15 37 15 35" stroke="#DB2777" strokeWidth="2" strokeLinecap="round" />
            <circle cx="33" cy="14" r="7" fill="#F59E0B" />
            <circle cx="33" cy="14" r="5" fill="#D4AF37" />
            <path d="M33 11V17M31 13H35" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-800">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-400">Resumo financeiro e análise de desempenho</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white border border-pink-100 p-1.5 rounded-xl shadow-sm self-start">
          <Button variant="secondary" className="h-8 w-8 !p-0 !min-w-0 !rounded-lg" onClick={handlePrevMonth}>
            &larr;
          </Button>
          <span className="text-sm font-bold text-slate-700 px-3 min-w-[120px] text-center select-none font-sans">
            {monthsList[month - 1]} de {year}
          </span>
          <Button variant="secondary" className="h-8 w-8 !p-0 !min-w-0 !rounded-lg" onClick={handleNextMonth}>
            &rarr;
          </Button>
        </div>
      </div>

      {/* Ações Rápidas */}
      <section className="grid grid-cols-3 gap-3 sm:flex sm:items-center sm:gap-4 bg-white border border-pink-100 p-4 rounded-2xl shadow-sm">
        <button 
          type="button" 
          onClick={() => openQuickAdd('INCOME')}
          className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 active:scale-[0.98] transition-all text-emerald-600 font-bold text-xs sm:text-sm shadow-sm cursor-pointer flex-1 sm:flex-none"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Nova Receita</span>
        </button>
        <button 
          type="button" 
          onClick={() => openQuickAdd('EXPENSE')}
          className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-pink-200 bg-rose-50/50 hover:bg-rose-50 active:scale-[0.98] transition-all text-rose-600 font-bold text-xs sm:text-sm shadow-sm cursor-pointer flex-1 sm:flex-none"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
          </svg>
          <span>Nova Despesa</span>
        </button>
        <button 
          type="button" 
          onClick={() => openQuickAdd('TRANSFER')}
          className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 active:scale-[0.98] transition-all text-blue-600 font-bold text-xs sm:text-sm shadow-sm cursor-pointer flex-1 sm:flex-none"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          <span>Transferência</span>
        </button>
      </section>

      {exceededBudgets.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div className="grid gap-1">
              <h3 className="text-sm font-bold text-rose-600 uppercase tracking-wider">Alertas de Limite Excedido</h3>
              <p className="text-xs text-slate-500 font-semibold">Você ultrapassou o orçamento estipulado para as seguintes categorias:</p>
              <ul className="mt-2 grid gap-1.5 pl-4 list-disc text-xs text-rose-700 font-bold">
                {exceededBudgets.map((b) => (
                  <li key={b.id}>
                    <strong>{b.name}</strong>: gastou{' '}
                    <span className="font-sans">{currency.format(b.spent)}</span>{' '}
                    de{' '}
                    <span className="font-sans">{currency.format(b.limit)}</span>{' '}
                    (Excesso de <span className="text-rose-600 font-sans">{currency.format(b.spent - b.limit)}</span>)
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
        <article className="card p-6">
          <h2 className="text-2xl font-bold text-slate-800">Evolução Mensal (Receitas x Despesas)</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">Comparativo histórico dos últimos meses lançados</p>
          <div className="mt-4">
            <MonthlyBarChart data={chartData} />
          </div>
        </article>

        <article className="card p-6">
          <h2 className="text-2xl font-bold text-slate-800">Distribuição por Categoria</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">Despesas do mês selecionado por categoria</p>
          <div className="mt-4 h-[280px]">
            {categoryData.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                <svg className="w-8 h-8 text-pink-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-3.75-3.75m0 0l3.75-3.75M8.25 12h7.5m-7.5 3H12" />
                </svg>
                <p className="text-sm font-semibold">Sem despesas neste período.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={3}>
                    {categoryData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      borderColor: '#f3e8eb', 
                      borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(219, 39, 119, 0.06)',
                      fontFamily: 'Quicksand, sans-serif'
                    }}
                    itemStyle={{ color: '#3d2e32', fontSize: '12px', fontWeight: 'bold' }}
                    formatter={(value) => currency.format(value)} 
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontWeight: 'bold', color: '#6b7280' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <article className="card p-6">
          <h2 className="text-2xl font-bold text-slate-800">Minhas Contas</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">Saldos atuais em suas carteiras e contas</p>
          
          <div className="grid gap-4">
            {accounts.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-400">
                <svg className="w-8 h-8 text-pink-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.33l-7.5-5-7.5 5V21" />
                </svg>
                <p className="text-sm font-semibold">Nenhuma conta encontrada</p>
              </div>
            ) : (
              accounts.map((acc) => {
                const val = Number(acc.balance)
                return (
                  <div key={acc.id} className="flex items-center justify-between border-b border-pink-50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2.5">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: acc.color }} />
                      <div className="grid gap-0.5">
                        <span className="font-bold text-sm text-slate-700 line-clamp-1">{acc.name}</span>
                        <span className="text-[10px] font-bold text-slate-400">{accountTypeLabels[acc.type]}</span>
                      </div>
                    </div>
                    <span className="font-sans text-right text-xs">
                      {acc.type === 'CREDIT_CARD' ? (
                        <div className="grid gap-0.5 text-right">
                          <span className="text-rose-500 font-bold">
                            {currency.format(Math.abs(val))}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400">
                            de {currency.format(Number(acc.creditLimit))}
                          </span>
                        </div>
                      ) : (
                        <span className={`text-sm font-bold ${val >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
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

        <article className="card p-6">
          <h2 className="text-2xl font-bold text-slate-800">Orçamentos do Mês</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">Limite de gastos por categoria</p>
          
          <div className="grid gap-5">
            {budgetProgress.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-400">
                <svg className="w-8 h-8 text-pink-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-semibold text-center">Nenhum limite definido</p>
              </div>
            ) : (
              budgetProgress.map((budget) => {
                const barColor = 
                  budget.percent >= 100 
                    ? 'bg-rose-500' 
                    : budget.percent >= 85 
                      ? 'bg-orange-400' 
                      : budget.percent >= 70 
                        ? 'bg-amber-400' 
                        : 'bg-emerald-500'
                
                const textColor = 
                  budget.percent >= 100 
                    ? 'text-rose-600' 
                    : budget.percent >= 85 
                      ? 'text-orange-500' 
                      : budget.percent >= 70 
                        ? 'text-amber-500' 
                        : 'text-emerald-600'

                return (
                  <div key={budget.id} className="grid gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-bold text-slate-700">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: budget.color }} />
                        {budget.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold font-sans">
                        <span className={`font-bold ${textColor}`}>{currency.format(budget.spent)}</span>
                        {' / '}
                        {currency.format(budget.limit)}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-pink-100/50 p-0.5">
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

        <article className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-2xl font-bold text-slate-800">Metas</h2>
              <Link to="/goals" className="text-xs text-pink-600 font-bold hover:text-pink-500 transition-colors">
                Ver todos &rarr;
              </Link>
            </div>
            <p className="text-xs text-slate-400 mb-6">Objetivos mais próximos do prazo</p>
            
            <div className="grid gap-5">
              {closestGoals.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-400">
                  <svg className="w-8 h-8 text-pink-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18m-9-9a9 9 0 100 18 9 9 0 000-18zm0 5a4 4 0 100 8 4 4 0 000-8z" />
                  </svg>
                  <p className="text-sm font-semibold text-center">Nenhuma meta ativa</p>
                </div>
              ) : (
                closestGoals.map((goal) => {
                  const target = Number(goal.targetAmount)
                  const current = Number(goal.currentAmount)
                  const percent = target > 0 ? Math.min((current / target) * 100, 100) : 0
                  
                  const barColor = 
                    percent >= 100 
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-400' 
                      : percent >= 50 
                        ? 'bg-gradient-to-r from-pink-400 to-rose-400' 
                        : 'bg-gradient-to-r from-amber-400 to-orange-400'
                  
                  return (
                    <div key={goal.id} className="grid gap-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-slate-700 line-clamp-1" title={goal.name}>
                          {goal.name}
                        </span>
                        <span className="text-[9px] font-bold font-sans">
                          <span className={goal.daysLeft > 0 ? 'text-pink-500' : goal.daysLeft === 0 ? 'text-amber-500' : 'text-rose-500'}>
                            {formatRemainingTimeShort(goal.daysLeft)}
                          </span>
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-pink-100/50 p-0.5">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`} 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold font-sans">
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
            <div className="mt-5 pt-3 border-t border-pink-50 text-center">
              <Link to="/goals">
                <Button variant="secondary" className="w-full text-xs h-9">
                  Ir para Objetivos
                </Button>
              </Link>
            </div>
          )}
        </article>

        <article className="card p-6">
          <h2 className="text-2xl font-bold text-slate-800">Últimos Lançamentos</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">Atividades financeiras recentes</p>
          
          <div className="grid gap-4">
            {transactions.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-400">
                <svg className="w-8 h-8 text-pink-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a6 6 0 01-2-4.472M22.5 18.75a6 6 0 00-2-4.472M12 22.5a6 6 0 01-6-6V9a6 6 0 0112 0v7.5a6 6 0 01-6 6zM12 5.25a2.25 2.25 0 110-4.5 2.25 2.25 0 010 4.5z" />
                </svg>
                <p className="text-sm font-semibold">Nenhum lançamento registrado</p>
              </div>
            ) : (
              transactions.slice(0, 5).map((tx) => {
                const isIncome = tx.type === 'INCOME'
                const isTransfer = tx.type === 'TRANSFER'
                const valueColor = isIncome 
                  ? 'text-emerald-600' 
                  : isTransfer 
                    ? 'text-blue-600' 
                    : 'text-rose-500'
                const valuePrefix = isIncome ? '+' : isTransfer ? '' : '-'

                return (
                  <div key={tx.id} className="flex items-center justify-between border-b border-pink-50 pb-3 last:border-0 last:pb-0">
                    <div className="grid gap-0.5 col-span-2">
                      <span className="font-bold text-sm text-slate-700 line-clamp-1">{tx.description}</span>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                        <span>{formatDateShort(tx.date)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tx.category?.color ?? '#cbd5e1' }} />
                          {tx.category?.name ?? 'Sem categoria'}
                        </span>
                      </div>
                    </div>
                    <span className={`font-sans text-xs font-bold text-right ${valueColor}`}>
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
