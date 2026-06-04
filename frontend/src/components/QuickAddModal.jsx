import React, { useEffect, useState } from 'react'
import { useQuickAddStore } from '../store/quickAddStore'
import { api, getApiError } from '../services/api'
import { formatCurrencyValue } from '../utils/labels'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

const initialForm = {
  type: 'EXPENSE',
  amount: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
  categoryId: '',
  accountId: '',
  destinationAccountId: '',
  goalId: '',
}

export function QuickAddModal() {
  const { isOpen, defaultType, defaultGoalId, close } = useQuickAddStore()
  const [form, setForm] = useState(initialForm)
  const [accounts, setAccounts] = useState([])
  const [categories, setCategories] = useState([])
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Reset form and set default values when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm({
        ...initialForm,
        type: defaultType || 'EXPENSE',
        goalId: defaultGoalId || '',
        date: new Date().toISOString().slice(0, 10),
      })
      setError('')
      loadOptions()
    }
  }, [isOpen, defaultType, defaultGoalId])

  async function loadOptions() {
    setLoading(true)
    try {
      const [{ data: accs }, { data: cats }, { data: gls }] = await Promise.all([
        api.get('/accounts'),
        api.get('/categories'),
        api.get('/goals'),
      ])
      setAccounts(accs)
      setCategories(cats)
      setGoals(gls)

      // Preselect first account if not already selected
      if (accs.length > 0) {
        setForm((curr) => ({
          ...curr,
          accountId: curr.accountId || accs[0].id,
        }))
      }
    } catch (err) {
      console.error('Erro ao carregar opções do lançamento rápido', err)
    } finally {
      setLoading(false)
    }
  }

  function handleTypeChange(type) {
    setError('')
    if (type === 'PAY_INVOICE') {
      const firstCard = accounts.find((acc) => acc.type === 'CREDIT_CARD')
      setForm((curr) => ({
        ...curr,
        type,
        accountId: firstCard ? firstCard.id : '',
      }))
    } else {
      const firstAccount = accounts[0]
      const currentAccountId = form.accountId || (firstAccount ? firstAccount.id : '')
      setForm((curr) => ({
        ...curr,
        type,
        accountId: currentAccountId,
        destinationAccountId: type === 'TRANSFER' && accounts.length > 1
          ? (accounts.find((acc) => acc.id !== currentAccountId)?.id || '')
          : '',
      }))
    }
  }

  function handleChange(event) {
    const { name, value } = event.target
    if (name === 'amount') {
      const formatted = formatCurrencyValue(value)
      setForm((curr) => ({ ...curr, [name]: formatted }))
    } else {
      setForm((curr) => ({ ...curr, [name]: value }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    // Pay invoice flow
    if (form.type === 'PAY_INVOICE') {
      const selectedCard = accounts.find((a) => a.id === form.accountId)
      if (!selectedCard) {
        setError('Por favor, selecione um cartão de crédito')
        setSaving(false)
        return
      }

      const confirmPay = confirm(`Deseja realmente zerar a fatura do cartão "${selectedCard.name}"?`)
      if (!confirmPay) {
        setSaving(false)
        return
      }

      try {
        await api.post(`/accounts/${form.accountId}/pay-invoice`, {})
        window.dispatchEvent(new CustomEvent('transaction-saved'))
        close()
      } catch (err) {
        setError(getApiError(err, 'Não foi possível pagar a fatura'))
      } finally {
        setSaving(false)
      }
      return
    }

    const amountValue = form.amount
      ? Number(form.amount.replace(/\./g, '').replace(',', '.'))
      : 0

    const payload = {
      type: form.type,
      amount: amountValue,
      description: form.description,
      date: form.date,
      categoryId: form.type === 'TRANSFER' ? null : (form.categoryId || null),
      accountId: form.accountId,
      destinationAccountId: form.type === 'TRANSFER' ? form.destinationAccountId : null,
      goalId: form.type === 'EXPENSE' ? (form.goalId || null) : null,
    }

    try {
      await api.post('/transactions', payload)
      // Dispatch global custom event for other pages to listen and reload data
      window.dispatchEvent(new CustomEvent('transaction-saved'))
      close()
    } catch (err) {
      setError(getApiError(err, 'Não foi possível salvar o lançamento'))
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  // Escape key support
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') close()
  }

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-end sm:items-center sm:justify-center bg-slate-950/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200 overflow-y-auto"
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div 
        className="w-full bg-slate-900 border border-slate-800/80 rounded-t-2xl sm:rounded-xl shadow-2xl p-6 flex flex-col gap-5 sm:max-w-md animate-in slide-in-from-bottom duration-300 max-h-[92vh] sm:max-h-none overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-800/60 pb-3">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Lançamento Rápido</h3>
            <p className="text-xs text-slate-400 mt-0.5">Cadastre uma movimentação rapidamente</p>
          </div>
          <button 
            type="button" 
            onClick={close}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            &times;
          </button>
        </header>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Segmented control for type */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => handleTypeChange('EXPENSE')}
              className={`py-2 px-2.5 rounded-md text-center transition-all ${form.type === 'EXPENSE' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
            >
              Despesa
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('INCOME')}
              className={`py-2 px-2.5 rounded-md text-center transition-all ${form.type === 'INCOME' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
            >
              Receita
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('TRANSFER')}
              className={`py-2 px-2.5 rounded-md text-center transition-all ${form.type === 'TRANSFER' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
            >
              Transferência
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('PAY_INVOICE')}
              className={`py-2 px-2.5 rounded-md text-center transition-all ${form.type === 'PAY_INVOICE' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
            >
              Pagar Fatura
            </button>
          </div>

          {form.type === 'PAY_INVOICE' ? (
            <div className="flex flex-col gap-4">
              <label className="grid gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Cartão de Crédito
                <select
                  name="accountId"
                  className="h-11 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  value={form.accountId}
                  onChange={handleChange}
                  required
                  disabled={loading}
                >
                  <option value="">Selecione o cartão</option>
                  {accounts.filter((acc) => acc.type === 'CREDIT_CARD').map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Fatura: R$ {Math.abs(Number(acc.balance)).toFixed(2)})
                    </option>
                  ))}
                </select>
              </label>

              {form.accountId && (() => {
                const selectedCard = accounts.find((a) => a.id === form.accountId)
                if (!selectedCard) return null
                const debt = Math.abs(Number(selectedCard.balance))
                return (
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-center animate-in fade-in slide-in-from-top duration-200">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Valor da Fatura a Zerar</span>
                    <strong className="text-xl font-black text-emerald-400 mt-1 block">
                      {Number(debt).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </strong>
                  </div>
                )
              })()}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Valor" name="amount" type="text" placeholder="Ex: 50,00" value={form.amount} onChange={handleChange} required className="h-11" />
                <Input label="Data" name="date" type="date" value={form.date} onChange={handleChange} required className="h-11" />
              </div>

              <Input label="Descrição" name="description" value={form.description} onChange={handleChange} required className="h-11" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="grid gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {form.type === 'TRANSFER' ? 'Conta Origem' : 'Conta'}
                  <select
                    name="accountId"
                    className="h-11 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    value={form.accountId}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  >
                    <option value="">Selecione uma conta</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (R$ {Number(acc.balance).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </label>

                {form.type === 'TRANSFER' ? (
                  <label className="grid gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Conta Destino
                    <select
                      name="destinationAccountId"
                      className="h-11 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      value={form.destinationAccountId}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    >
                      <option value="">Selecione a conta destino</option>
                      {accounts
                        .filter((acc) => acc.id !== form.accountId)
                        .map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} (R$ {Number(acc.balance).toFixed(2)})
                          </option>
                        ))}
                    </select>
                  </label>
                ) : (
                  <label className="grid gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Categoria
                    <select
                      name="categoryId"
                      className="h-11 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      value={form.categoryId}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="">Sem categoria</option>
                      {categories
                        .filter((cat) => cat.type === 'BOTH' || cat.type === form.type)
                        .map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
              </div>

              {form.type === 'EXPENSE' && goals.length > 0 && (
                <label className="grid gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Meta de Economia (Aporte)
                  <select
                    name="goalId"
                    className="h-11 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    value={form.goalId}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">Sem meta (Não é aporte)</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} (Alvo: R$ {Number(g.targetAmount).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <Button 
              type="button" 
              variant="secondary" 
              className="flex-1 h-11" 
              onClick={close}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500" 
              disabled={saving || loading}
            >
              {saving ? 'Salvando...' : 'Confirmar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
