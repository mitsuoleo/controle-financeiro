import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { api, getApiError } from '../services/api'
import { formatCurrency, transactionTypeLabels, formatCurrencyValue } from '../utils/labels'

const initialForm = {
  type: 'EXPENSE',
  amount: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
  categoryId: '',
  accountId: '',
  destinationAccountId: '',
  isRecurring: false,
  frequency: 'MONTHLY',
  endDate: '',
  goalId: '',
}

const initialFilters = {
  type: '',
  categoryId: '',
  accountId: '',
  startDate: '',
  endDate: '',
  page: 1,
  limit: 10,
}

const frequencyLabels = {
  DAILY: 'Diário',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  YEARLY: 'Anual',
}

export default function Transactions() {
  const location = useLocation()
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [goals, setGoals] = useState([])
  const [recurringRules, setRecurringRules] = useState([])
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, pages: 0 })
  const [form, setForm] = useState(initialForm)
  const [filters, setFilters] = useState(initialFilters)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('transactions') // 'transactions' | 'recurring'

  const filteredParams = useMemo(() => {
    return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '' && value !== null))
  }, [filters])

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [{ data: txData }, { data: categoryData }, { data: accountData }, { data: recurringData }, { data: goalsData }] = await Promise.all([
        api.get('/transactions', { params: filteredParams }),
        api.get('/categories'),
        api.get('/accounts'),
        api.get('/recurring-transactions'),
        api.get('/goals'),
      ])
      setTransactions(txData.data)
      setMeta(txData.meta)
      setCategories(categoryData)
      setAccounts(accountData)
      setRecurringRules(recurringData)
      setGoals(goalsData)

      // Pré-selecionar conta se estiver vazia e houver contas
      if (!form.accountId && accountData.length > 0) {
        setForm((current) => ({ ...current, accountId: accountData[0].id }))
      }
    } catch (err) {
      setError(getApiError(err, 'Não foi possível carregar os lançamentos'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filteredParams])

  useEffect(() => {
    if (location.state?.goalId) {
      setForm((current) => ({
        ...current,
        type: location.state.type || 'EXPENSE',
        goalId: location.state.goalId,
      }))
      window.history.replaceState({}, document.title)
    }
  }, [location])

  function updateForm(event) {
    const { name, value, type, checked } = event.target
    const val = type === 'checkbox' ? checked : value

    if (name === 'amount') {
      const formatted = formatCurrencyValue(value)
      setForm((current) => ({ ...current, [name]: formatted }))
    } else if (name === 'type') {
      if (value === 'PAY_INVOICE') {
        const firstCard = accounts.find((acc) => acc.type === 'CREDIT_CARD')
        setForm((current) => ({
          ...current,
          type: value,
          accountId: firstCard ? firstCard.id : '',
        }))
      } else {
        const firstAccount = accounts[0]
        const currentAccountId = form.accountId || (firstAccount ? firstAccount.id : '')
        setForm((current) => ({
          ...current,
          type: value,
          accountId: currentAccountId,
          destinationAccountId: value === 'TRANSFER' && accounts.length > 1
            ? (accounts.find((acc) => acc.id !== currentAccountId)?.id || '')
            : '',
        }))
      }
    } else {
      setForm((current) => ({ ...current, [name]: val }))
    }
  }

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value, page: 1 }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)

    // Se for pagamento de fatura
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
        setForm({
          ...initialForm,
          accountId: accounts.length > 0 ? accounts[0].id : '',
        })
        await loadData()
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

    // Se for recorrente e estiver criando (não editando)
    if (form.isRecurring && !editingId) {
      const payload = {
        description: form.description,
        amount: amountValue,
        type: form.type,
        frequency: form.frequency,
        startDate: form.date,
        endDate: form.endDate || null,
        categoryId: form.type === 'TRANSFER' ? null : (form.categoryId || null),
        accountId: form.accountId,
        destinationAccountId: form.type === 'TRANSFER' ? form.destinationAccountId : null,
      }

      try {
        await api.post('/recurring-transactions', payload)
        setForm({
          ...initialForm,
          accountId: accounts.length > 0 ? accounts[0].id : '',
        })
        await loadData()
      } catch (err) {
        setError(getApiError(err, 'Não foi possível salvar o agendamento'))
      } finally {
        setSaving(false)
      }
      return
    }

    // Transação comum (ou edição)
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
      if (editingId) {
        await api.put(`/transactions/${editingId}`, payload)
      } else {
        await api.post('/transactions', payload)
      }
      setForm({
        ...initialForm,
        accountId: accounts.length > 0 ? accounts[0].id : '',
      })
      setEditingId(null)
      await loadData()
    } catch (err) {
      setError(getApiError(err, 'Não foi possível salvar o lançamento'))
    } finally {
      setSaving(false)
    }
  }

  function startEdit(transaction) {
    setEditingId(transaction.id)
    setForm({
      type: transaction.type,
      amount: transaction.amount !== null && transaction.amount !== undefined
        ? formatCurrencyValue(String(Math.round(Number(transaction.amount) * 100)))
        : '',
      description: transaction.description,
      date: transaction.date.slice(0, 10),
      categoryId: transaction.categoryId ?? '',
      accountId: transaction.accountId ?? '',
      destinationAccountId: transaction.destinationAccountId ?? '',
      isRecurring: false,
      frequency: 'MONTHLY',
      endDate: '',
      goalId: transaction.goalId ?? '',
    })
  }

  async function removeTransaction(id) {
    setError('')

    try {
      await api.delete(`/transactions/${id}`)
      await loadData()
    } catch (err) {
      setError(getApiError(err, 'Não foi possível excluir o lançamento'))
    }
  }

  async function toggleRecurringRule(rule) {
    setError('')
    try {
      await api.put(`/recurring-transactions/${rule.id}`, {
        isActive: !rule.isActive
      })
      await loadData()
    } catch (err) {
      setError(getApiError(err, 'Não foi possível alterar o status do agendamento'))
    }
  }

  async function deleteRecurringRule(id) {
    if (!confirm('Deseja realmente excluir este agendamento?')) {
      return
    }
    setError('')
    try {
      await api.delete(`/recurring-transactions/${id}`)
      await loadData()
    } catch (err) {
      setError(getApiError(err, 'Não foi possível excluir o agendamento'))
    }
  }

  function exportToCSV() {
    const headers = ['Descrição', 'Conta', 'Categoria/Destino', 'Data', 'Tipo', 'Valor']
    
    const rows = transactions.map((tx) => {
      const isTransfer = tx.type === 'TRANSFER'
      const destinationOrCategory = isTransfer 
        ? (tx.destinationAccount?.name ?? '') 
        : (tx.category?.name ?? '')
      const accountName = tx.account?.name ?? ''
      const amount = Number(tx.amount).toFixed(2).replace('.', ',')
      const formattedDate = new Date(tx.date).toLocaleDateString('pt-BR')
      const typeLabel = transactionTypeLabels[tx.type] ?? tx.type

      return [
        `"${tx.description.replace(/"/g, '""')}"`,
        `"${accountName.replace(/"/g, '""')}"`,
        `"${destinationOrCategory.replace(/"/g, '""')}"`,
        `"${formattedDate}"`,
        `"${typeLabel}"`,
        `"${amount}"`
      ]
    })

    const csvContent = [
      headers.join(';'),
      ...rows.map((row) => row.join(';'))
    ].join('\r\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `lancamentos_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  async function exportToPDF() {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    
    const doc = new jsPDF()

    doc.setFillColor(15, 23, 42)
    doc.rect(0, 0, 210, 40, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.text('CONTROLE FINANCEIRO PESSOAL', 15, 20)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('Relatório Consolidado de Lançamentos', 15, 30)
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 130, 30)

    doc.setTextColor(51, 65, 85)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Filtros Aplicados:', 15, 52)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const filterDesc = []
    if (filters.type) filterDesc.push(`Tipo: ${transactionTypeLabels[filters.type]}`)
    if (filters.accountId) {
      const acc = accounts.find((a) => a.id === filters.accountId)
      if (acc) filterDesc.push(`Conta: ${acc.name}`)
    }
    if (filters.categoryId) {
      const cat = categories.find((c) => c.id === filters.categoryId)
      if (cat) filterDesc.push(`Categoria: ${cat.name}`)
    }
    if (filters.startDate) filterDesc.push(`Início: ${new Date(filters.startDate).toLocaleDateString('pt-BR')}`)
    if (filters.endDate) filterDesc.push(`Fim: ${new Date(filters.endDate).toLocaleDateString('pt-BR')}`)
    
    const filterText = filterDesc.length > 0 ? filterDesc.join(' | ') : 'Nenhum (Todos os lançamentos)'
    doc.text(filterText, 15, 58)

    const totalIncome = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const totalExpense = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const netBalance = totalIncome - totalExpense

    doc.setDrawColor(226, 232, 240)
    doc.setFillColor(248, 250, 252)
    doc.rect(15, 65, 55, 20, 'FD')
    doc.rect(77, 65, 55, 20, 'FD')
    doc.rect(140, 65, 55, 20, 'FD')

    doc.setFontSize(8)
    doc.setTextColor(71, 85, 105)
    doc.text('TOTAL RECEITAS', 18, 71)
    doc.text('TOTAL DESPESAS', 80, 71)
    doc.text('SALDO LÍQUIDO', 143, 71)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(16, 185, 129)
    doc.text(formatCurrency(totalIncome), 18, 79)
    doc.setTextColor(239, 68, 68)
    doc.text(formatCurrency(totalExpense), 80, 79)
    doc.setTextColor(netBalance >= 0 ? 16 : 239, netBalance >= 0 ? 185 : 68, netBalance >= 0 ? 129 : 68)
    doc.text(formatCurrency(netBalance), 143, 79)

    const tableHeaders = [['Descrição', 'Conta', 'Categoria/Destino', 'Data', 'Tipo', 'Valor']]
    const tableRows = transactions.map((tx) => {
      const isTransfer = tx.type === 'TRANSFER'
      const destinationOrCategory = isTransfer 
        ? (tx.destinationAccount?.name ?? '-') 
        : (tx.category?.name ?? '-')
      const accountName = tx.account?.name ?? '-'
      const formattedDate = new Date(tx.date).toLocaleDateString('pt-BR')
      const typeLabel = transactionTypeLabels[tx.type] ?? tx.type
      const valueStr = `${tx.type === 'EXPENSE' ? '- ' : tx.type === 'INCOME' ? '+ ' : ''}${formatCurrency(tx.amount)}`
      
      return [
        tx.description,
        accountName,
        destinationOrCategory,
        formattedDate,
        typeLabel,
        valueStr
      ]
    })

    autoTable(doc, {
      startY: 92,
      head: tableHeaders,
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        5: { halign: 'right', fontStyle: 'bold' }
      },
      styles: { fontSize: 9, cellPadding: 3.5 },
      margin: { left: 15, right: 15 }
    })

    doc.save(`relatorio_financeiro_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const canGoBack = meta.page > 1
  const canGoForward = meta.page < meta.pages

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Lançamentos</h1>
        <p className="mt-1.5 text-sm text-slate-400">Gerencie e cadastre suas receitas, despesas e transferências</p>
      </div>

      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <form className="grid gap-5 rounded-xl border border-slate-800/80 bg-slate-900 p-5 shadow-xl self-start" onSubmit={handleSubmit}>
          <h2 className="text-lg font-bold text-white tracking-tight">
            {editingId ? 'Editar lançamento' : form.type === 'PAY_INVOICE' ? 'Confirmar Pagamento' : form.isRecurring ? 'Novo agendamento' : 'Novo lançamento'}
          </h2>

          <label className="grid gap-1.5 text-sm font-medium text-slate-300">
            Tipo
            <select
              name="type"
              className="h-10 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              value={form.type}
              onChange={updateForm}
              disabled={!!editingId} // Não permite alterar tipo na edição
            >
              <option value="EXPENSE">Despesa</option>
              <option value="INCOME">Receita</option>
              <option value="TRANSFER">Transferência</option>
              <option value="PAY_INVOICE">Pagamento de Fatura</option>
            </select>
          </label>

          {form.type === 'PAY_INVOICE' ? (
            <>
              <label className="grid gap-1.5 text-sm font-medium text-slate-300">
                Cartão de Crédito
                <select
                  name="accountId"
                  className="h-10 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  value={form.accountId}
                  onChange={updateForm}
                  required
                >
                  <option value="">Selecione o cartão</option>
                  {accounts.filter((acc) => acc.type === 'CREDIT_CARD').length === 0 ? (
                    <option value="" disabled>Nenhum cartão cadastrado</option>
                  ) : (
                    accounts
                      .filter((acc) => acc.type === 'CREDIT_CARD')
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} (Fatura: R$ {Math.abs(Number(acc.balance)).toFixed(2)})
                        </option>
                      ))
                  )}
                </select>
              </label>

              {form.accountId && (() => {
                const selectedCard = accounts.find((a) => a.id === form.accountId)
                if (!selectedCard) return null
                const debt = Math.abs(Number(selectedCard.balance))
                return (
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-center animate-in fade-in slide-in-from-top duration-200">
                    <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider block">Valor da Fatura a Zerar</span>
                    <strong className="text-xl font-black text-emerald-400 mt-1 block">
                      {Number(debt).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </strong>
                  </div>
                )
              })()}
            </>
          ) : (
            <>
              <Input label="Valor" name="amount" type="text" placeholder="Ex: 50,00" value={form.amount} onChange={updateForm} required />
              <Input label="Descrição" name="description" value={form.description} onChange={updateForm} required />
              <Input label={form.isRecurring ? "Data de Início" : "Data"} name="date" type="date" value={form.date} onChange={updateForm} required />

              {/* Seleção de Contas */}
              <label className="grid gap-1.5 text-sm font-medium text-slate-300">
                {form.type === 'TRANSFER' ? 'Conta de Origem' : 'Conta'}
                <select
                  name="accountId"
                  className="h-10 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  value={form.accountId}
                  onChange={updateForm}
                  required
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
                <label className="grid gap-1.5 text-sm font-medium text-slate-300">
                  Conta de Destino
                  <select
                    name="destinationAccountId"
                    className="h-10 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    value={form.destinationAccountId}
                    onChange={updateForm}
                    required
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
                <>
                  <label className="grid gap-1.5 text-sm font-medium text-slate-300">
                    Categoria
                    <select
                      name="categoryId"
                      className="h-10 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      value={form.categoryId}
                      onChange={updateForm}
                    >
                      <option value="">Sem categoria</option>
                      {categories
                        .filter((cat) => form.type === 'BOTH' || cat.type === 'BOTH' || cat.type === form.type)
                        .map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                    </select>
                  </label>

                  {form.type === 'EXPENSE' && (
                    <label className="grid gap-1.5 text-sm font-medium text-slate-300">
                      Meta de Economia (Aporte)
                      <select
                        name="goalId"
                        className="h-10 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        value={form.goalId}
                        onChange={updateForm}
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
                </>
              )}

              {/* Recorrência (apenas na criação) */}
              {!editingId && (
                <div className="grid gap-3 pt-2 border-t border-slate-800/60">
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isRecurring"
                      className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-emerald-500 outline-none focus:ring-0"
                      checked={form.isRecurring}
                      onChange={updateForm}
                    />
                    Tornar este lançamento recorrente
                  </label>

                  {form.isRecurring && (
                    <div className="grid gap-3 pl-6 border-l-2 border-slate-800">
                      <label className="grid gap-1.5 text-sm font-medium text-slate-300">
                        Frequência
                        <select
                          name="frequency"
                          className="h-10 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500"
                          value={form.frequency}
                          onChange={updateForm}
                        >
                          <option value="DAILY">Diário</option>
                          <option value="WEEKLY">Semanal</option>
                          <option value="MONTHLY">Mensal</option>
                          <option value="YEARLY">Anual</option>
                        </select>
                      </label>

                      <Input
                        label="Data Limite (opcional)"
                        name="endDate"
                        type="date"
                        value={form.endDate}
                        onChange={updateForm}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {error && <p className="rounded-md bg-red-950/50 border border-red-900/50 px-3 py-2 text-sm text-red-400">{error}</p>}

          <div className="flex gap-2 mt-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Confirmando...' : form.type === 'PAY_INVOICE' ? 'Confirmar Pagamento' : editingId ? 'Salvar' : 'Adicionar'}
            </Button>
            {editingId && (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingId(null)
                  setForm({
                    ...initialForm,
                    accountId: accounts.length > 0 ? accounts[0].id : '',
                  })
                }}
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>

        <article className="rounded-xl border border-slate-800/80 bg-slate-900 shadow-xl overflow-hidden self-start">
          {/* Sub-abas */}
          <div className="flex border-b border-slate-800 bg-slate-900/50">
            <button
              type="button"
              className={`flex-1 py-4 text-sm font-bold tracking-tight border-b-2 outline-none transition-colors duration-200 ${
                activeTab === 'transactions'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-950/10'
              }`}
              onClick={() => setActiveTab('transactions')}
            >
              Todos os Lançamentos
            </button>
            <button
              type="button"
              className={`flex-1 py-4 text-sm font-bold tracking-tight border-b-2 outline-none transition-colors duration-200 ${
                activeTab === 'recurring'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-950/10'
              }`}
              onClick={() => setActiveTab('recurring')}
            >
              Agenda de Lançamentos Recorrentes
            </button>
          </div>

          {activeTab === 'transactions' ? (
            <>
              {/* Filtros */}
              <div className="flex flex-wrap gap-4 border-b border-slate-800 bg-slate-900/50 p-4 items-end">
                <label className="flex-1 min-w-[160px] grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Tipo
                  <select
                    className="h-10 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    value={filters.type}
                    onChange={(event) => updateFilter('type', event.target.value)}
                  >
                    <option value="">Todos os tipos</option>
                    <option value="INCOME">Receitas</option>
                    <option value="EXPENSE">Despesas</option>
                    <option value="TRANSFER">Transferências</option>
                  </select>
                </label>
                <label className="flex-1 min-w-[160px] grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Conta
                  <select
                    className="h-10 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    value={filters.accountId}
                    onChange={(event) => updateFilter('accountId', event.target.value)}
                  >
                    <option value="">Todas as contas</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex-1 min-w-[160px] grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Categoria
                  <select
                    className="h-10 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    value={filters.categoryId}
                    onChange={(event) => updateFilter('categoryId', event.target.value)}
                  >
                    <option value="">Todas categorias</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex-1 min-w-[140px]">
                  <Input
                    label="Início"
                    type="date"
                    value={filters.startDate}
                    onChange={(event) => updateFilter('startDate', event.target.value)}
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <Input
                    label="Fim"
                    type="date"
                    value={filters.endDate}
                    onChange={(event) => updateFilter('endDate', event.target.value)}
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <Button variant="secondary" className="w-full h-10 cursor-pointer" onClick={() => setFilters(initialFilters)}>
                    Limpar Filtros
                  </Button>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <Button variant="secondary" className="w-full h-10 cursor-pointer" onClick={exportToCSV}>
                    Exportar CSV
                  </Button>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <Button variant="secondary" className="w-full h-10 cursor-pointer" onClick={exportToPDF}>
                    Exportar PDF
                  </Button>
                </div>
              </div>

              {/* Tabela de Lançamentos */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-950/40 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-4">Descrição</th>
                      <th className="px-5 py-4">Origem / Conta</th>
                      <th className="px-5 py-4">Categoria / Destino</th>
                      <th className="px-5 py-4">Data</th>
                      <th className="px-5 py-4">Tipo</th>
                      <th className="px-5 py-4 text-right">Valor</th>
                      <th className="px-5 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {loading ? (
                      <tr>
                        <td className="px-5 py-8 text-slate-400 text-center" colSpan="7">
                          <div className="flex items-center justify-center gap-3">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                            Carregando lançamentos...
                          </div>
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td className="px-5 py-8 text-slate-500 text-center" colSpan="7">
                          Nenhum lançamento encontrado
                        </td>
                      </tr>
                    ) : (
                      transactions.map((transaction) => {
                        const isIncome = transaction.type === 'INCOME'
                        const isExpense = transaction.type === 'EXPENSE'
                        const isTransfer = transaction.type === 'TRANSFER'
                        const valColor = isIncome ? 'text-emerald-400' : isExpense ? 'text-rose-400' : 'text-blue-400'

                        return (
                          <tr key={transaction.id} className="hover:bg-slate-950/20 transition-colors duration-150">
                            <td className="px-5 py-4 font-semibold text-slate-100">{transaction.description}</td>
                            <td className="px-5 py-4 text-slate-300">
                              {transaction.account ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: transaction.account.color }} />
                                  {transaction.account.name}
                                </span>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              {isTransfer ? (
                                transaction.destinationAccount ? (
                                  <span className="inline-flex items-center gap-1.5 text-blue-400">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: transaction.destinationAccount.color }} />
                                    {transaction.destinationAccount.name}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">-</span>
                                )
                              ) : (
                                <div className="flex flex-col gap-1 items-start">
                                  {transaction.category ? (
                                    <span
                                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                                      style={{
                                        backgroundColor: `${transaction.category.color}15`,
                                        borderColor: `${transaction.category.color}40`,
                                        color: transaction.category.color,
                                      }}
                                    >
                                      {transaction.category.name}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">-</span>
                                  )}
                                  {transaction.goal && (
                                    <span 
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/30 text-violet-400 text-[10px] font-bold uppercase tracking-wider"
                                      title={`Meta: ${transaction.goal.name}`}
                                    >
                                      🎯 {transaction.goal.name}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-4 text-slate-400">{new Date(transaction.date).toLocaleDateString('pt-BR')}</td>
                            <td className="px-5 py-4 text-slate-400">{transactionTypeLabels[transaction.type]}</td>
                            <td className={`px-5 py-4 text-right font-bold ${valColor}`}>
                              {isIncome ? '+ ' : isExpense ? '- ' : ''}
                              {formatCurrency(transaction.amount)}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                <Button variant="secondary" className="h-8 px-2.5 text-xs" onClick={() => startEdit(transaction)}>
                                  Editar
                                </Button>
                                <Button variant="danger" className="h-8 px-2.5 text-xs" onClick={() => removeTransaction(transaction.id)}>
                                  Excluir
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 p-4 text-sm text-slate-400 bg-slate-950/20">
                <span>
                  <strong>{meta.total}</strong> lançamento{meta.total === 1 ? '' : 's'} encontrado{meta.total === 1 ? '' : 's'}
                </span>
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    className="h-8 px-3 text-xs"
                    disabled={!canGoBack}
                    onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}
                  >
                    Anterior
                  </Button>
                  <span className="text-xs font-semibold text-slate-400 select-none">
                    Página {meta.pages === 0 ? 0 : meta.page} de {meta.pages}
                  </span>
                  <Button
                    variant="secondary"
                    className="h-8 px-3 text-xs"
                    disabled={!canGoForward}
                    onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Tabela de Lançamentos Recorrentes */
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-950/40 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-4">Descrição</th>
                    <th className="px-5 py-4">Tipo</th>
                    <th className="px-5 py-4">Origem / Conta</th>
                    <th className="px-5 py-4">Categoria / Destino</th>
                    <th className="px-5 py-4">Frequência</th>
                    <th className="px-5 py-4">Próximo Vencimento</th>
                    <th className="px-5 py-4 text-right">Valor</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td className="px-5 py-8 text-slate-400 text-center" colSpan="9">
                        <div className="flex items-center justify-center gap-3">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                          Carregando agendamentos...
                        </div>
                      </td>
                    </tr>
                  ) : recurringRules.length === 0 ? (
                    <tr>
                      <td className="px-5 py-8 text-slate-500 text-center" colSpan="9">
                        Nenhum lançamento recorrente agendado
                      </td>
                    </tr>
                  ) : (
                    recurringRules.map((rule) => {
                      const isIncome = rule.type === 'INCOME'
                      const isExpense = rule.type === 'EXPENSE'
                      const isTransfer = rule.type === 'TRANSFER'
                      const valColor = isIncome ? 'text-emerald-400' : isExpense ? 'text-rose-400' : 'text-blue-400'

                      return (
                        <tr key={rule.id} className="hover:bg-slate-950/20 transition-colors duration-150">
                          <td className="px-5 py-4 font-semibold text-slate-100">{rule.description}</td>
                          <td className="px-5 py-4 text-slate-400">{transactionTypeLabels[rule.type]}</td>
                          <td className="px-5 py-4 text-slate-300">
                            {rule.account ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: rule.account.color }} />
                                {rule.account.name}
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {isTransfer ? (
                              rule.destinationAccount ? (
                                <span className="inline-flex items-center gap-1.5 text-blue-400">
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: rule.destinationAccount.color }} />
                                  {rule.destinationAccount.name}
                                </span>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )
                            ) : rule.category ? (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                                style={{
                                  backgroundColor: `${rule.category.color}15`,
                                  borderColor: `${rule.category.color}40`,
                                  color: rule.category.color,
                                }}
                              >
                                {rule.category.name}
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-slate-300 font-semibold">{frequencyLabels[rule.frequency]}</td>
                          <td className="px-5 py-4 text-slate-400">
                            {new Date(rule.nextDueDate).toLocaleDateString('pt-BR')}
                          </td>
                          <td className={`px-5 py-4 text-right font-bold ${valColor}`}>
                            {isIncome ? '+ ' : isExpense ? '- ' : ''}
                            {formatCurrency(rule.amount)}
                          </td>
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              className={`px-2.5 py-1 rounded text-xs font-bold transition border cursor-pointer ${
                                rule.isActive
                                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400 hover:bg-emerald-900/40'
                                  : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:bg-slate-900/40'
                              }`}
                              onClick={() => toggleRecurringRule(rule)}
                            >
                              {rule.isActive ? 'Ativo' : 'Pausado'}
                            </button>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <Button variant="danger" className="h-8 px-2.5 text-xs" onClick={() => deleteRecurringRule(rule.id)}>
                                Excluir
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </div>
  )
}
