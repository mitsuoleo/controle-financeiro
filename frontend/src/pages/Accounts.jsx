import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { api, getApiError } from '../services/api'
import { formatCurrencyValue } from '../utils/labels'

const accountTypeLabels = {
  CHECKING: 'Conta Corrente',
  SAVINGS: 'Poupança',
  INVESTMENT: 'Investimento',
  CASH: 'Dinheiro (Carteira)',
  CREDIT_CARD: 'Cartão de Crédito',
}

const initialForm = {
  name: '',
  type: 'CHECKING',
  color: '#6366f1',
  balance: '',
  creditLimit: '',
}

export default function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
  // Controle de pagamento de fatura
  const [payingAccountId, setPayingAccountId] = useState(null)
  const [paymentOriginId, setPaymentOriginId] = useState('')

  async function loadAccounts() {
    setLoading(true)
    try {
      const { data } = await api.get('/accounts')
      setAccounts(data)
    } catch (err) {
      setError(getApiError(err, 'Não foi possível carregar as contas'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  function updateForm(event) {
    const { name, value } = event.target
    if (name === 'balance' || name === 'creditLimit') {
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

    const balanceValue = form.balance
      ? Number(form.balance.replace(/\./g, '').replace(',', '.'))
      : 0
    const limitValue = form.creditLimit
      ? Number(form.creditLimit.replace(/\./g, '').replace(',', '.'))
      : null

    const payload = {
      name: form.name,
      type: form.type,
      color: form.color,
      balance: balanceValue,
      creditLimit: limitValue,
    }

    try {
      if (editingId) {
        // Enviar atualização de limite se for cartão de crédito
        await api.put(`/accounts/${editingId}`, {
          name: form.name,
          type: form.type,
          color: form.color,
          creditLimit: form.type === 'CREDIT_CARD' ? limitValue : null,
        })
      } else {
        await api.post('/accounts', payload)
      }
      setForm(initialForm)
      setEditingId(null)
      await loadAccounts()
    } catch (err) {
      setError(getApiError(err, 'Não foi possível salvar a conta'))
    } finally {
      setSaving(false)
    }
  }

  function startEdit(account) {
    setEditingId(account.id)
    setForm({
      name: account.name,
      type: account.type,
      color: account.color,
      balance: account.balance !== null && account.balance !== undefined
        ? formatCurrencyValue(String(Math.round(Number(account.balance) * 100)))
        : '',
      creditLimit: account.creditLimit !== null && account.creditLimit !== undefined
        ? formatCurrencyValue(String(Math.round(Number(account.creditLimit) * 100)))
        : '',
    })
  }

  async function removeAccount(id) {
    if (!confirm('Deseja realmente excluir esta conta? Todas as transações associadas serão removidas')) {
      return
    }

    setError('')
    try {
      await api.delete(`/accounts/${id}`)
      if (editingId === id) {
        setEditingId(null)
        setForm(initialForm)
      }
      await loadAccounts()
    } catch (err) {
      setError(getApiError(err, 'Não foi possível excluir a conta'))
    }
  }

  async function handlePayInvoice(event) {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      await api.post(`/accounts/${payingAccountId}/pay-invoice`, {
        originAccountId: paymentOriginId || null
      })
      setPayingAccountId(null)
      setPaymentOriginId('')
      await loadAccounts()
    } catch (err) {
      setError(getApiError(err, 'Não foi possível pagar a fatura'))
    } finally {
      setSaving(false)
    }
  }

  const selectedPayingAccount = accounts.find(a => a.id === payingAccountId)

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">Contas</h1>
        <p className="mt-1.5 text-sm text-slate-400">Gerencie suas contas bancárias, cartões de crédito e carteiras físicas</p>
      </div>

      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form className="card grid gap-5 p-5 self-start" onSubmit={handleSubmit}>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">{editingId ? 'Editar conta' : 'Nova conta'}</h2>

          <Input label="Nome da Conta" name="name" value={form.name} onChange={updateForm} required />

          <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            Tipo de Conta
            <select
              name="type"
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/15 cursor-pointer"
              value={form.type}
              onChange={updateForm}
              disabled={!!editingId}
            >
              <option value="CHECKING">Conta Corrente</option>
              <option value="SAVINGS">Poupança</option>
              <option value="INVESTMENT">Investimento</option>
              <option value="CASH">Dinheiro (Carteira)</option>
              <option value="CREDIT_CARD">Cartão de Crédito</option>
            </select>
          </label>

          {form.type === 'CREDIT_CARD' ? (
            <Input
              label="Limite do Cartão"
              name="creditLimit"
              type="text"
              placeholder="Ex: 1.000,00"
              value={form.creditLimit}
              onChange={updateForm}
              required
            />
          ) : (
            !editingId && (
              <Input
                label="Saldo Inicial"
                name="balance"
                type="text"
                placeholder="Ex: 1.000,00"
                value={form.balance}
                onChange={updateForm}
              />
            )
          )}

          <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            Cor de Identificação
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
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Contas Cadastradas</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-pink-50/40 text-xs uppercase tracking-wider text-slate-500 border-b border-pink-100">
                <tr>
                  <th className="px-5 py-4">Nome</th>
                  <th className="px-5 py-4">Tipo</th>
                  <th className="px-5 py-4">Cor</th>
                  <th className="px-5 py-4 text-right">Saldo / Limite</th>
                  <th className="px-5 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-100/50">
                {loading ? (
                  <tr>
                    <td className="px-5 py-8 text-slate-500 text-center" colSpan="5">
                      <div className="flex items-center justify-center gap-3">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
                        Carregando contas...
                      </div>
                    </td>
                  </tr>
                ) : accounts.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-slate-400 text-center" colSpan="5">
                      Nenhuma conta cadastrada
                    </td>
                  </tr>
                ) : (
                  accounts.map((account) => (
                    <tr key={account.id} className="hover:bg-pink-50/20 transition-colors duration-150">
                      <td className="px-5 py-4 font-semibold text-slate-800">{account.name}</td>
                      <td className="px-5 py-4 text-slate-500">{accountTypeLabels[account.type]}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 text-slate-600">
                          <span className="h-4 w-4 rounded-full border border-slate-200 shadow-sm" style={{ background: account.color }} />
                          <code className="text-xs text-slate-400 font-mono">{account.color}</code>
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-sans">
                        {account.type === 'CREDIT_CARD' ? (
                          <div className="grid gap-0.5 text-right">
                            <span className="text-rose-600 font-bold">
                              Fatura: {Number(Math.abs(Number(account.balance))).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                            <span className="text-xs text-slate-500 font-semibold">
                              Disp: {Number(Number(account.creditLimit) + Number(account.balance)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                            <span className="text-xs text-slate-400">
                              Limite total: {Number(account.creditLimit).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                        ) : (
                          <span className={`font-bold ${Number(account.balance) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {Number(account.balance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {account.type === 'CREDIT_CARD' && Number(account.balance) < 0 && (
                            <Button 
                              variant="secondary" 
                              className="h-8 px-2.5 text-xs !bg-emerald-50 !border-emerald-200 !text-emerald-600 hover:!bg-emerald-100/50" 
                              onClick={() => setPayingAccountId(account.id)}
                            >
                              Pagar Fatura
                            </Button>
                          )}
                          <Button variant="secondary" className="h-8 px-2.5 text-xs" onClick={() => startEdit(account)}>
                            Editar
                          </Button>
                          <Button variant="danger" className="h-8 px-2.5 text-xs" onClick={() => removeAccount(account.id)}>
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

      {payingAccountId && selectedPayingAccount && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handlePayInvoice}
            className="modal w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200 grid gap-5"
          >
            <div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Pagar Fatura</h3>
              <p className="mt-1 text-sm text-slate-400">
                Pagar fatura do cartão <strong>{selectedPayingAccount.name}</strong>
              </p>
            </div>

            <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-center shadow-sm">
              <span className="text-xs text-rose-600 font-bold uppercase tracking-wider block">Valor total a pagar</span>
              <strong className="text-2xl font-black text-rose-600 mt-1 block font-sans">
                {Number(Math.abs(Number(selectedPayingAccount.balance))).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </strong>
            </div>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              Debitar valor da conta:
              <select
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/15 cursor-pointer"
                value={paymentOriginId}
                onChange={(e) => setPaymentOriginId(e.target.value)}
              >
                <option value="">Apenas marcar como paga (sem debitar)</option>
                {accounts
                  .filter((a) => a.type !== 'CREDIT_CARD')
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (Saldo: R$ {Number(a.balance).toFixed(2)})
                    </option>
                  ))}
              </select>
            </label>

            {error && <p className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm font-semibold text-rose-600">{error}</p>}

            <div className="flex justify-end gap-3 mt-2">
              <Button 
                variant="secondary" 
                type="button" 
                onClick={() => {
                  setPayingAccountId(null)
                  setPaymentOriginId('')
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Registrando...' : 'Confirmar Pagamento'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
