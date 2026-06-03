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
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Contas</h1>
        <p className="mt-1.5 text-sm text-slate-400">Gerencie suas contas bancárias, cartões de crédito e carteiras físicas</p>
      </div>

      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form className="grid gap-5 rounded-xl border border-slate-800/80 bg-slate-900 p-5 shadow-xl self-start" onSubmit={handleSubmit}>
          <h2 className="text-lg font-bold text-white tracking-tight">{editingId ? 'Editar conta' : 'Nova conta'}</h2>

          <Input label="Nome da Conta" name="name" value={form.name} onChange={updateForm} required />

          <label className="grid gap-1.5 text-sm font-medium text-slate-300">
            Tipo de Conta
            <select
              name="type"
              className="h-10 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              value={form.type}
              onChange={updateForm}
              disabled={!!editingId} // Não permite mudar tipo de conta existente
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

          <label className="grid gap-1.5 text-sm font-medium text-slate-300">
            Cor de Identificação
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
            <h2 className="text-lg font-bold text-white tracking-tight">Contas Cadastradas</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-950/40 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">Nome</th>
                  <th className="px-5 py-4">Tipo</th>
                  <th className="px-5 py-4">Cor</th>
                  <th className="px-5 py-4 text-right">Saldo / Limite</th>
                  <th className="px-5 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td className="px-5 py-8 text-slate-400 text-center" colSpan="5">
                      <div className="flex items-center justify-center gap-3">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                        Carregando contas...
                      </div>
                    </td>
                  </tr>
                ) : accounts.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-slate-500 text-center" colSpan="5">
                      Nenhuma conta cadastrada
                    </td>
                  </tr>
                ) : (
                  accounts.map((account) => (
                    <tr key={account.id} className="hover:bg-slate-950/20 transition-colors duration-150">
                      <td className="px-5 py-4 font-semibold text-slate-100">{account.name}</td>
                      <td className="px-5 py-4 text-slate-400">{accountTypeLabels[account.type]}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 text-slate-300">
                          <span className="h-4 w-4 rounded-full border border-slate-800 shadow" style={{ background: account.color }} />
                          <code className="text-xs text-slate-400 font-mono">{account.color}</code>
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-mono">
                        {account.type === 'CREDIT_CARD' ? (
                          <div className="grid gap-0.5 text-right">
                            <span className="text-rose-400 font-semibold">
                              Fatura: {Number(Math.abs(Number(account.balance))).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                            <span className="text-xs text-slate-400">
                              Disp: {Number(Number(account.creditLimit) + Number(account.balance)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                            <span className="text-xs text-slate-500">
                              Limite total: {Number(account.creditLimit).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                        ) : (
                          <span className={`font-bold ${Number(account.balance) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {Number(account.balance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {account.type === 'CREDIT_CARD' && Number(account.balance) < 0 && (
                            <Button 
                              variant="secondary" 
                              className="h-8 px-2.5 text-xs !bg-emerald-500/10 !border-emerald-500/20 !text-emerald-400 hover:!bg-emerald-500/20" 
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

      {/* Modal de Pagamento de Fatura */}
      {payingAccountId && selectedPayingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form 
            onSubmit={handlePayInvoice}
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in duration-200 grid gap-5"
          >
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Pagar Fatura</h3>
              <p className="mt-1 text-sm text-slate-400">
                Pagar fatura do cartão <strong>{selectedPayingAccount.name}</strong>
              </p>
            </div>

            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-center">
              <span className="text-xs text-rose-400 font-semibold uppercase tracking-wider block">Valor total a pagar</span>
              <strong className="text-2xl font-black text-rose-400 mt-1 block">
                {Number(Math.abs(Number(selectedPayingAccount.balance))).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </strong>
            </div>

            <label className="grid gap-1.5 text-sm font-medium text-slate-300">
              Debitar valor da conta:
              <select
                className="h-10 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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

            {error && <p className="rounded-md bg-red-950/50 border border-red-900/50 px-3 py-2 text-sm text-red-400">{error}</p>}

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
