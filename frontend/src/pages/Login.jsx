import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { getApiError } from '../services/api'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { isAuthenticated, login, register } = useAuthStore()

  if (isAuthenticated) return <Navigate to="/" replace />

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    // Validações manuais no cliente para evitar falhas silenciosas do navegador
    if (mode === 'register') {
      const trimmedName = form.name.trim()
      if (trimmedName.length < 2) {
        setError('O nome deve ter pelo menos 2 caracteres')
        return
      }
    }

    const trimmedEmail = form.email.trim()
    if (!trimmedEmail) {
      setError('Preencha o campo de e-mail')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setError('Formato de e-mail inválido')
      return
    }

    if (!form.password) {
      setError('Preencha o campo de senha')
      return
    }

    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      if (mode === 'login') {
        await login({ email: trimmedEmail, password: form.password })
      } else {
        await register({ name: form.name.trim(), email: trimmedEmail, password: form.password })
      }
    } catch (err) {
      setError(getApiError(err, 'Confira os dados e tente novamente'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-10 antialiased">
      <section className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900 p-8 shadow-2xl transition-all duration-300 hover:border-slate-700/50">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Financeiro Pessoal</h1>
          <p className="mt-2 text-sm text-slate-400">
            {mode === 'login' ? 'Entre para acompanhar seus lançamentos' : 'Crie sua conta para começar'}
          </p>
        </div>

        <form className="grid gap-5" onSubmit={handleSubmit} noValidate>
          {mode === 'register' && (
            <Input label="Nome" name="name" value={form.name} onChange={updateField} required />
          )}
          <Input label="E-mail" type="email" name="email" value={form.email} onChange={updateField} required />
          <Input
            label="Senha"
            type="password"
            name="password"
            value={form.password}
            onChange={updateField}
            required
          />

          {error && (
            <p className="rounded-md bg-red-950/50 border border-red-900/50 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? 'Enviando...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </Button>
        </form>

        <button
          type="button"
          className="mt-6 w-full text-center text-sm font-semibold text-slate-400 hover:text-slate-100 transition-colors duration-200 cursor-pointer"
          onClick={() => {
            setError('')
            setMode(mode === 'login' ? 'register' : 'login')
          }}
        >
          {mode === 'login' ? 'Ainda não tenho conta' : 'Já tenho uma conta'}
        </button>
      </section>
    </main>
  )
}
