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
    <main className="grid min-h-screen place-items-center bg-[var(--color-background)] px-4 py-10 antialiased">
      <section className="card w-full max-w-md p-8 shadow-xl border border-pink-100/80 hover:shadow-2xl hover:border-pink-200 transition-all duration-300 bg-white/85 backdrop-blur-md">
        <div className="flex flex-col items-center text-center mb-8">
          <svg className="w-16 h-16 text-pink-400 drop-shadow-sm mb-4" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M48 38C48 44.6274 41.2843 50 33 50C24.7157 50 18 44.6274 18 38C18 31.3726 24.7157 26 33 26C41.2843 26 48 31.3726 48 38Z" fill="#F472B6" />
            <path d="M22 27L16 20L23 23Z" fill="#DB2777" />
            <path d="M50 37C50 39.2091 48.8807 41 47.5 41C46.1193 41 45 39.2091 45 37C45 34.7909 46.1193 33 47.5 33C48.8807 33 50 34.7909 50 37Z" fill="#DB2777" />
            <circle cx="38" cy="33" r="2" fill="#3D2E32" />
            <rect x="23" y="48" width="5" height="6" rx="2.5" fill="#DB2777" />
            <rect x="38" y="48" width="5" height="6" rx="2.5" fill="#DB2777" />
            <path d="M18 38C16 38 15 37 15 35" stroke="#DB2777" strokeWidth="2" strokeLinecap="round" />
            <circle cx="33" cy="14" r="7" fill="#F59E0B" />
            <circle cx="33" cy="14" r="5" fill="#D4AF37" />
            <path d="M33 11V17M31 13H35" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Financeiro Pessoal</h1>
          <p className="mt-2 text-sm text-slate-500">
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
            <p className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm font-semibold text-rose-600">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? 'Enviando...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </Button>
        </form>

        <button
          type="button"
          className="mt-6 w-full text-center text-sm font-bold text-slate-500 hover:text-pink-600 transition-colors duration-200 cursor-pointer"
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
