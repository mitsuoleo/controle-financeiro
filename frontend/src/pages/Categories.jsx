import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { api, getApiError } from '../services/api'
import { categoryTypeLabels, formatCurrencyValue } from '../utils/labels'

const initialForm = {
  name: '',
  color: '#6366f1',
  icon: 'tag',
  type: 'BOTH',
  maxLimit: '',
}

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadCategories() {
    setLoading(true)
    const { data } = await api.get('/categories')
    setCategories(data)
    setLoading(false)
  }

  useEffect(() => {
    loadCategories()
  }, [])

  function updateForm(event) {
    const { name, value } = event.target
    if (name === 'maxLimit') {
      const formatted = formatCurrencyValue(value)
      setForm((current) => ({ ...current, [name]: formatted }))
    } else {
      setForm((current) => ({ ...current, [name]: value }))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)

    const maxLimitValue = form.maxLimit
      ? Number(form.maxLimit.replace(/\./g, '').replace(',', '.'))
      : null

    const payload = {
      ...form,
      maxLimit: maxLimitValue,
    }

    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, payload)
      } else {
        await api.post('/categories', payload)
      }
      setForm(initialForm)
      setEditingId(null)
      await loadCategories()
    } catch (err) {
      setError(getApiError(err, 'Não foi possível salvar a categoria'))
    } finally {
      setSaving(false)
    }
  }

  function startEdit(category) {
    setEditingId(category.id)
    setForm({
      name: category.name,
      color: category.color,
      icon: category.icon,
      type: category.type,
      maxLimit: category.maxLimit !== null && category.maxLimit !== undefined 
        ? formatCurrencyValue(String(Math.round(Number(category.maxLimit) * 100))) 
        : '',
    })
  }

  async function removeCategory(id) {
    setError('')

    try {
      await api.delete(`/categories/${id}`)
      if (editingId === id) {
        setEditingId(null)
        setForm(initialForm)
      }
      await loadCategories()
    } catch (err) {
      setError(getApiError(err, 'Não foi possível excluir a categoria'))
    }
  }

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Categorias</h1>
        <p className="mt-1.5 text-sm text-slate-400">Organize suas receitas e despesas para obter filtros e relatórios mais precisos</p>
      </div>

      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form className="grid gap-5 rounded-xl border border-slate-800/80 bg-slate-900 p-5 shadow-xl self-start" onSubmit={handleSubmit}>
          <h2 className="text-lg font-bold text-white tracking-tight">{editingId ? 'Editar categoria' : 'Nova categoria'}</h2>

          <Input label="Nome" name="name" value={form.name} onChange={updateForm} required />

          <label className="grid gap-1.5 text-sm font-medium text-slate-300">
            Tipo
            <select
              name="type"
              className="h-10 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              value={form.type}
              onChange={updateForm}
            >
              <option value="BOTH">Ambos</option>
              <option value="INCOME">Receita</option>
              <option value="EXPENSE">Despesa</option>
            </select>
          </label>

          {(form.type === 'EXPENSE' || form.type === 'BOTH') && (
            <Input
              label="Limite de Gastos Mensal (opcional)"
              name="maxLimit"
              type="text"
              placeholder="Ex: 500,00"
              value={form.maxLimit}
              onChange={updateForm}
            />
          )}

          <Input label="Ícone" name="icon" value={form.icon} onChange={updateForm} required />

          <label className="grid gap-1.5 text-sm font-medium text-slate-300">
            Cor
            <div className="flex gap-3">
              <input
                className="h-10 w-14 rounded-md border border-slate-800 bg-slate-950 p-1 cursor-pointer"
                type="color"
                name="color"
                value={form.color}
                onChange={updateForm}
              />
              <input
                aria-label="Código da cor"
                className="h-10 flex-1 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                name="color"
                value={form.color}
                onChange={updateForm}
                required
              />
            </div>
          </label>

          {error && <p className="rounded-md bg-red-950/50 border border-red-900/50 px-3 py-2 text-sm text-red-400">{error}</p>}

          <div className="flex gap-2 mt-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar' : 'Adicionar'}
            </Button>
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

        <article className="rounded-xl border border-slate-800/80 bg-slate-900 shadow-xl overflow-hidden">
          <div className="border-b border-slate-800 bg-slate-900/50 p-4">
            <h2 className="text-lg font-bold text-white tracking-tight">Categorias Cadastradas</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-950/40 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">Nome</th>
                  <th className="px-5 py-4">Tipo</th>
                  <th className="px-5 py-4">Limite Mensal</th>
                  <th className="px-5 py-4">Ícone</th>
                  <th className="px-5 py-4">Cor</th>
                  <th className="px-5 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td className="px-5 py-8 text-slate-400 text-center" colSpan="6">
                      <div className="flex items-center justify-center gap-3">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                        Carregando categorias...
                      </div>
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-slate-500 text-center" colSpan="6">
                      Nenhuma categoria cadastrada
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category.id} className="hover:bg-slate-950/20 transition-colors duration-150">
                      <td className="px-5 py-4 font-semibold text-slate-100">{category.name}</td>
                      <td className="px-5 py-4 text-slate-400">{categoryTypeLabels[category.type]}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-400">
                        {category.maxLimit !== null && category.maxLimit !== undefined ? (
                          <span className="font-semibold text-rose-400">
                            {Number(category.maxLimit).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        ) : (
                          <span className="text-slate-500">Sem limite</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        <span className="font-mono bg-slate-950/40 px-2 py-1 rounded text-xs text-slate-300 border border-slate-800">
                          {category.icon}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 text-slate-300">
                          <span className="h-4 w-4 rounded-full border border-slate-800 shadow" style={{ background: category.color }} />
                          <code className="text-xs text-slate-400 font-mono">{category.color}</code>
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" className="h-8 px-2.5 text-xs" onClick={() => startEdit(category)}>
                            Editar
                          </Button>
                          <Button variant="danger" className="h-8 px-2.5 text-xs" onClick={() => removeCategory(category.id)}>
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
