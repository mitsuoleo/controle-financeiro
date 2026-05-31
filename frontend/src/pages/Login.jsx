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
    setLoading(true)

    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password })
      } else {
        await register(form)
      }
    } catch (err) {
      setError(getApiError(err, 'Confira os dados e tente novamente.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-950">Financeiro Pessoal</h1>
          <p className="mt-2 text-sm text-slate-500">
            {mode === 'login' ? 'Entre para acompanhar seus lancamentos.' : 'Crie sua conta para comecar.'}
          </p>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <Input label="Nome" name="name" value={form.name} onChange={updateField} required />
          )}
          <Input label="E-mail" type="email" name="email" value={form.email} onChange={updateField} required />
          <Input
            label="Senha"
            type="password"
            name="password"
            minLength={6}
            value={form.password}
            onChange={updateField}
            required
          />

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? 'Enviando...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </Button>
        </form>

        <button
          type="button"
          className="mt-5 w-full text-center text-sm font-medium text-slate-600 hover:text-slate-950"
          onClick={() => {
            setError('')
            setMode(mode === 'login' ? 'register' : 'login')
          }}
        >
          {mode === 'login' ? 'Ainda nao tenho conta' : 'Ja tenho uma conta'}
        </button>
      </section>
    </main>
  )
}
