import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { api, getApiError } from '../services/api'

const initialForm = {
  type: 'EXPENSE',
  amount: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
  categoryId: '',
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(initialForm)
  const [filters, setFilters] = useState({ type: '', categoryId: '' })
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const filteredParams = useMemo(() => {
    return Object.fromEntries(Object.entries(filters).filter(([, value]) => value))
  }, [filters])

  async function loadData() {
    setLoading(true)
    const [{ data: txData }, { data: categoryData }] = await Promise.all([
      api.get('/transactions', { params: filteredParams }),
      api.get('/categories'),
    ])
    setTransactions(txData.data)
    setCategories(categoryData)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [filteredParams])

  function updateForm(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const payload = {
      ...form,
      amount: Number(form.amount),
      categoryId: form.categoryId || null,
    }

    try {
      if (editingId) {
        await api.put(`/transactions/${editingId}`, payload)
      } else {
        await api.post('/transactions', payload)
      }
      setForm(initialForm)
      setEditingId(null)
      await loadData()
    } catch (err) {
      setError(getApiError(err, 'Nao foi possivel salvar o lancamento.'))
    }
  }

  function startEdit(transaction) {
    setEditingId(transaction.id)
    setForm({
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      date: transaction.date.slice(0, 10),
      categoryId: transaction.categoryId ?? '',
    })
  }

  async function removeTransaction(id) {
    await api.delete(`/transactions/${id}`)
    await loadData()
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">Lancamentos</h1>
        <p className="mt-2 text-slate-500">Cadastre receitas, despesas e transferencias.</p>
      </div>

      <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <form className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
          <h2 className="text-lg font-bold text-slate-950">{editingId ? 'Editar lancamento' : 'Novo lancamento'}</h2>

          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Tipo
            <select
              name="type"
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.type}
              onChange={updateForm}
            >
              <option value="INCOME">Receita</option>
              <option value="EXPENSE">Despesa</option>
              <option value="TRANSFER">Transferencia</option>
            </select>
          </label>

          <Input label="Valor" name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={updateForm} required />
          <Input label="Descricao" name="description" value={form.description} onChange={updateForm} required />
          <Input label="Data" name="date" type="date" value={form.date} onChange={updateForm} required />

          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Categoria
            <select
              name="categoryId"
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={form.categoryId}
              onChange={updateForm}
            >
              <option value="">Sem categoria</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit">{editingId ? 'Salvar' : 'Adicionar'}</Button>
            {editingId && (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingId(null)
                  setForm(initialForm)
                }}
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>

        <article className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={filters.type}
              onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
            >
              <option value="">Todos os tipos</option>
              <option value="INCOME">Receitas</option>
              <option value="EXPENSE">Despesas</option>
              <option value="TRANSFER">Transferencias</option>
            </select>
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={filters.categoryId}
              onChange={(event) => setFilters((current) => ({ ...current, categoryId: event.target.value }))}
            >
              <option value="">Todas categorias</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Descricao</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan="6">
                      Carregando...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan="6">
                      Nenhum lancamento encontrado.
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-4 py-3 font-medium text-slate-800">{transaction.description}</td>
                      <td className="px-4 py-3 text-slate-500">{transaction.category?.name ?? '-'}</td>
                      <td className="px-4 py-3 text-slate-500">{new Date(transaction.date).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-3 text-slate-500">{transaction.type}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {currency.format(Number(transaction.amount))}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" className="h-8 px-3" onClick={() => startEdit(transaction)}>
                            Editar
                          </Button>
                          <Button variant="danger" className="h-8 px-3" onClick={() => removeTransaction(transaction.id)}>
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  )
}
