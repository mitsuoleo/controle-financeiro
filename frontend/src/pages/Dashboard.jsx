import { useEffect, useMemo, useState } from 'react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { MonthlyBarChart } from '../components/charts/BarChart'
import { api } from '../services/api'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function StatCard({ label, value, tone }) {
  const toneClass = tone === 'green' ? 'text-green-700' : tone === 'red' ? 'text-red-700' : 'text-slate-950'

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <strong className={`mt-2 block text-2xl font-bold ${toneClass}`}>{currency.format(value)}</strong>
    </article>
  )
}

export default function Dashboard() {
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 })
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      const [{ data: summaryData }, { data: transactionsData }] = await Promise.all([
        api.get('/transactions/summary'),
        api.get('/transactions', { params: { limit: 100 } }),
      ])
      setSummary(summaryData)
      setTransactions(transactionsData.data)
      setLoading(false)
    }

    loadDashboard()
  }, [])

  const chartData = useMemo(() => {
    const byMonth = new Map()

    transactions.forEach((transaction) => {
      const date = new Date(transaction.date)
      const key = date.toLocaleDateString('pt-BR', { month: 'short' })
      const entry = byMonth.get(key) ?? { name: key, receitas: 0, despesas: 0 }

      if (transaction.type === 'INCOME') entry.receitas += Number(transaction.amount)
      if (transaction.type === 'EXPENSE') entry.despesas += Number(transaction.amount)

      byMonth.set(key, entry)
    })

    return Array.from(byMonth.values()).slice(-6)
  }, [transactions])

  const categoryData = useMemo(() => {
    const byCategory = new Map()

    transactions
      .filter((transaction) => transaction.type === 'EXPENSE')
      .forEach((transaction) => {
        const name = transaction.category?.name ?? 'Sem categoria'
        byCategory.set(name, (byCategory.get(name) ?? 0) + Number(transaction.amount))
      })

    return Array.from(byCategory.entries()).map(([name, value]) => ({ name, value }))
  }, [transactions])

  if (loading) {
    return <p className="text-sm text-slate-500">Carregando dashboard...</p>
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">Dashboard</h1>
        <p className="mt-2 text-slate-500">Resumo do mes atual e ultimos lancamentos.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Saldo" value={summary.balance} />
        <StatCard label="Receitas" value={summary.income} tone="green" />
        <StatCard label="Despesas" value={summary.expense} tone="red" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Receitas x despesas</h2>
          <div className="mt-4">
            <MonthlyBarChart data={chartData} />
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Gastos por categoria</h2>
          <div className="mt-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={92}>
                  {categoryData.map((entry, index) => (
                    <Cell key={entry.name} fill={['#0f172a', '#dc2626', '#f59e0b', '#2563eb', '#16a34a'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => currency.format(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>
    </div>
  )
}
