import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { api, getApiError } from '../services/api'
import { formatCurrency, formatCurrencyValue } from '../utils/labels'

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

  function formatRemainingTime(daysLeft) {
    if (daysLeft === 0) return 'Hoje'
    
    const absDays = Math.abs(daysLeft)
    let text = ''
    
    if (absDays >= 365) {
      const years = Math.floor(absDays / 365)
      const remainingMonths = Math.floor((absDays % 365) / 30)
      text = `${years} ${years === 1 ? 'ano' : 'anos'}`
      if (remainingMonths > 0) {
        text += ` e ${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`
      }
    } else if (absDays >= 30) {
      const months = Math.floor(absDays / 30)
      const remainingDays = absDays % 30
      text = `${months} ${months === 1 ? 'mês' : 'meses'}`
      if (remainingDays > 0) {
        text += ` e ${remainingDays} ${remainingDays === 1 ? 'dia' : 'dias'}`
      }
    } else {
      text = `${absDays} ${absDays === 1 ? 'dia' : 'dias'}`
    }
    
    return daysLeft < 0 ? `Encerrada (${text} atrás)` : text
  }

  return (
    <div className="grid gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">Metas de Economia</h1>
          <p className="mt-1.5 text-sm text-slate-400">Planeje e acompanhe seus objetivos financeiros de médio e longo prazo</p>
        </div>
        <Button onClick={startCreate} className="self-start">
          Novo Objetivo
        </Button>
      </div>

      {error && !showModal && (
        <p className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm font-semibold text-rose-600">{error}</p>
      )}

      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
          <p className="text-sm text-slate-500 font-medium">Carregando seus objetivos...</p>
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-pink-200 bg-white p-16 text-center shadow-md">
          <svg className="w-16 h-16 text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          <div className="grid gap-1">
            <h3 className="text-lg font-bold text-slate-800">Nenhum objetivo cadastrado</h3>
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

            let progressGradient = 'from-pink-300 to-pink-400'
            if (percent >= 100) {
              progressGradient = 'from-emerald-400 to-emerald-500'
            } else if (percent >= 50) {
              progressGradient = 'from-pink-500 to-rose-500'
            }

            return (
              <article 
                key={goal.id} 
                className="card flex flex-col justify-between p-6 shadow-md hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight line-clamp-1 group-hover:text-pink-600 transition-colors duration-200">
                      {goal.name}
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 border border-pink-100">
                      {percent.toFixed(0)}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1">
                    Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                  </p>

                  <div className="mt-5 grid gap-2">
                    <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 p-0.5 shadow-inner">
                      <div 
                        className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out ${progressGradient}`} 
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs font-sans font-bold mt-1 text-slate-500">
                      <span>{formatCurrency(current)}</span>
                      <span>de {formatCurrency(target)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-pink-100/60 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Tempo restante:</span>
                    {daysLeft > 0 ? (
                      <span className="font-semibold text-emerald-600">{formatRemainingTime(daysLeft)}</span>
                    ) : daysLeft === 0 ? (
                      <span className="font-bold text-amber-600">Hoje</span>
                    ) : (
                      <span className="font-semibold text-rose-600">{formatRemainingTime(daysLeft)}</span>
                    )}
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

      {showModal && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form 
            onSubmit={handleSubmit}
            className="modal w-full max-w-md grid gap-5 p-6 animate-in zoom-in-95 duration-200"
          >
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
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
              <p className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm font-semibold text-rose-600">
                {error}
              </p>
            )}

            <div className="flex gap-3 justify-end mt-2 pt-4 border-t border-pink-100">
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
