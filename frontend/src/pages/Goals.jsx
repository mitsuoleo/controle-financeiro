import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { api, getApiError } from '../services/api'
import { formatCurrency, formatCurrencyValue, formatRemainingTime } from '../utils/labels'

const initialForm = {
  name: '',
  targetAmount: '',
  deadline: '',
}

export default function Goals() {
  const navigate = useNavigate()
  const [goals, setGoals] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)

  async function loadGoals() {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/goals')
      setGoals(data)
    } catch (err) {
      setError(getApiError(err, 'Não foi possível carregar os objetivos'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGoals()
  }, [])

  function updateForm(event) {
    const { name, value } = event.target
    if (name === 'targetAmount') {
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

    const targetVal = form.targetAmount
      ? Number(form.targetAmount.replace(/\./g, '').replace(',', '.'))
      : 0

    if (targetVal <= 0) {
      setError('O valor alvo deve ser maior que zero')
      setSaving(false)
      return
    }

    if (!form.deadline) {
      setError('A data limite é obrigatória')
      setSaving(false)
      return
    }

    const payload = {
      name: form.name.trim(),
      targetAmount: targetVal,
      deadline: form.deadline,
    }

    try {
      if (editingId) {
        await api.put(`/goals/${editingId}`, payload)
      } else {
        await api.post('/goals', payload)
      }
      setForm(initialForm)
      setEditingId(null)
      setShowModal(false)
      await loadGoals()
    } catch (err) {
      setError(getApiError(err, 'Não foi possível salvar o objetivo'))
    } finally {
      setSaving(false)
    }
  }

  function startEdit(goal) {
    setEditingId(goal.id)
    setForm({
      name: goal.name,
      targetAmount: formatCurrencyValue(String(Math.round(Number(goal.targetAmount) * 100))),
      deadline: goal.deadline.slice(0, 10),
    })
    setError('')
    setShowModal(true)
  }

  function startCreate() {
    setEditingId(null)
    setForm(initialForm)
    setError('')
    setShowModal(true)
  }

  async function removeGoal(id) {
    if (!confirm('Deseja realmente excluir esta meta de economia? Os lançamentos associados permanecerão, mas desvinculados.')) {
      return
    }
    setError('')

    try {
      await api.delete(`/goals/${id}`)
      if (editingId === id) {
        setEditingId(null)
        setForm(initialForm)
      }
      await loadGoals()
    } catch (err) {
      setError(getApiError(err, 'Não foi possível excluir o objetivo'))
    }
  }

  function handleMakeDeposit(goalId) {
    navigate('/transactions', { state: { goalId, type: 'EXPENSE' } })
  }

  function getDaysRemaining(deadlineStr) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadline = new Date(deadlineStr)
    deadline.setHours(0, 0, 0, 0)
    
    const diffTime = deadline.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays
  }

  return (
    <div className="grid gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Metas de Economia</h1>
          <p className="mt-1.5 text-sm text-slate-400">Planeje e acompanhe seus objetivos financeiros de médio e longo prazo</p>
        </div>
        <Button onClick={startCreate} className="self-start">
          Novo Objetivo
        </Button>
      </div>

      {error && !showModal && (
        <p className="rounded-md bg-red-950/50 border border-red-900/50 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-slate-400 font-medium">Carregando seus objetivos...</p>
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-16 text-center shadow-lg">
          <span className="text-5xl">🎯</span>
          <div className="grid gap-1">
            <h3 className="text-lg font-bold text-white">Nenhum objetivo cadastrado</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Defina metas de poupança (ex: Viagem, Reserva de Emergência) e vincule despesas reais como aportes.
            </p>
          </div>
          <Button onClick={startCreate} className="mt-2">
            Começar Agora
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const target = Number(goal.targetAmount)
            const current = Number(goal.currentAmount)
            const percent = target > 0 ? Math.min((current / target) * 100, 100) : 0
            const daysLeft = getDaysRemaining(goal.deadline)

            let progressGradient = 'from-amber-500 to-orange-500'
            if (percent >= 100) {
              progressGradient = 'from-emerald-500 to-teal-400'
            } else if (percent >= 50) {
              progressGradient = 'from-blue-500 to-indigo-500'
            }

            return (
              <article 
                key={goal.id} 
                className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-900 p-6 shadow-xl hover:border-slate-700/50 hover:shadow-slate-950/40 transition-all duration-300 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold text-white tracking-tight line-clamp-1 group-hover:text-emerald-400 transition-colors duration-200">
                      {goal.name}
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {percent.toFixed(0)}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1">
                    Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                  </p>

                  {/* Barra de progresso */}
                  <div className="mt-5 grid gap-2">
                    <div className="h-3.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/60 p-0.5">
                      <div 
                        className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out ${progressGradient}`} 
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono mt-1 text-slate-400">
                      <span>{formatCurrency(current)}</span>
                      <span>de {formatCurrency(target)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/60 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Tempo restante:</span>
                    <span className={`font-semibold ${daysLeft > 0 ? 'text-emerald-400' : daysLeft === 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {formatRemainingTime(daysLeft)}
                    </span>
                  </div>

                  <div className="flex gap-2 items-center mt-1">
                    <Button 
                      variant="primary" 
                      onClick={() => handleMakeDeposit(goal.id)}
                      className="flex-1 text-xs h-9 px-3"
                    >
                      Fazer Aporte
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={() => startEdit(goal)}
                      className="text-xs h-9 px-3"
                    >
                      Editar
                    </Button>
                    <Button 
                      variant="danger" 
                      onClick={() => removeGoal(goal.id)}
                      className="text-xs h-9 px-3"
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Modal de Criação / Edição de Meta */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <form 
            onSubmit={handleSubmit}
            className="w-full max-w-md grid gap-5 rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <h2 className="text-xl font-bold text-white tracking-tight">
              {editingId ? 'Editar Objetivo' : 'Novo Objetivo'}
            </h2>

            <Input 
              label="Nome do Objetivo" 
              name="name" 
              placeholder="Ex: Reserva de Emergência, Carro Novo" 
              value={form.name} 
              onChange={updateForm} 
              required 
            />

            <Input 
              label="Valor Alvo (R$)" 
              name="targetAmount" 
              placeholder="Ex: 10.000,00" 
              value={form.targetAmount} 
              onChange={updateForm} 
              required 
            />

            <Input 
              label="Data Limite" 
              name="deadline" 
              type="date" 
              value={form.deadline} 
              onChange={updateForm} 
              required 
            />

            {error && (
              <p className="rounded-md bg-red-950/50 border border-red-900/50 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            <div className="flex gap-3 justify-end mt-2 pt-4 border-t border-slate-800">
              <Button 
                variant="secondary" 
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
