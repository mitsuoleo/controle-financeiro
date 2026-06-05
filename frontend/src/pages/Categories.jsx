import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { api, getApiError } from '../services/api'
import { categoryTypeLabels, formatCurrencyValue } from '../utils/labels'
import { CategoryIcon, iconOptions } from '../components/CategoryIcon'

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
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">Categorias</h1>
        <p className="mt-1.5 text-sm text-slate-400">Organize suas receitas e despesas para obter filtros e relatórios mais precisos</p>
      </div>

      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form className="card grid gap-5 p-5 self-start" onSubmit={handleSubmit}>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">{editingId ? 'Editar categoria' : 'Nova categoria'}</h2>

          <Input label="Nome" name="name" value={form.name} onChange={updateForm} required />

          <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            Tipo
            <select
              name="type"
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/15 cursor-pointer"
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

          <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            Ícone
            <select
              name="icon"
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/15 cursor-pointer"
              value={form.icon}
              onChange={updateForm}
            >
              {iconOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            Cor
            <div className="flex gap-3">
              <input
                className="h-11 w-14 rounded-xl border border-slate-200 bg-white p-1 cursor-pointer transition focus:border-pink-500"
                type="color"
                name="color"
                value={form.color}
                onChange={updateForm}
              />
              <input
                aria-label="Código da cor"
                className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/15"
                name="color"
                value={form.color}
                onChange={updateForm}
                required
              />
            </div>
          </label>

          {error && <p className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm font-semibold text-rose-600">{error}</p>}

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

        <article className="card overflow-hidden">
          <div className="border-b border-pink-100 bg-pink-50/10 p-4">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Categorias Cadastradas</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-pink-50/40 text-xs uppercase tracking-wider text-slate-500 border-b border-pink-100">
                <tr>
                  <th className="px-5 py-4">Nome</th>
                  <th className="px-5 py-4">Tipo</th>
                  <th className="px-5 py-4">Limite Mensal</th>
                  <th className="px-5 py-4">Ícone</th>
                  <th className="px-5 py-4">Cor</th>
                  <th className="px-5 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-100/50">
                {loading ? (
                  <tr>
                    <td className="px-5 py-8 text-slate-500 text-center" colSpan="6">
                      <div className="flex items-center justify-center gap-3">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
                        Carregando categorias...
                      </div>
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-slate-400 text-center" colSpan="6">
                      Nenhuma categoria cadastrada
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category.id} className="hover:bg-pink-50/20 transition-colors duration-150">
                      <td className="px-5 py-4 font-semibold text-slate-800">{category.name}</td>
                      <td className="px-5 py-4 text-slate-500">{categoryTypeLabels[category.type]}</td>
                      <td className="px-5 py-4 font-sans font-bold text-xs text-slate-500">
                        {category.maxLimit !== null && category.maxLimit !== undefined ? (
                          <span className="text-rose-600">
                            {Number(category.maxLimit).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">Sem limite</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm">
                            <CategoryIcon icon={category.icon} color={category.color} className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-extrabold text-slate-500 font-mono capitalize">{category.icon}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 text-slate-600">
                          <span className="h-4 w-4 rounded-full border border-slate-200 shadow-sm" style={{ background: category.color }} />
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
