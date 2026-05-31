import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import './index.css'
import { Button } from './components/ui/Button'
import { ProtectedRoute } from './hooks/useAuth.jsx'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Transactions from './pages/Transactions'
import { useAuthStore } from './store/authStore'

function AppShell() {
  const navigate = useNavigate()
  const { user, logout, loadMe } = useAuthStore()

  useEffect(() => {
    loadMe().catch(() => logout())
  }, [loadMe, logout])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-lg font-bold text-slate-950">
            Financeiro Pessoal
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link className="font-medium text-slate-600 hover:text-slate-950" to="/">
              Dashboard
            </Link>
            <Link className="font-medium text-slate-600 hover:text-slate-950" to="/transactions">
              Lancamentos
            </Link>
            <span className="hidden text-slate-400 sm:inline">{user?.name}</span>
            <Button variant="secondary" className="h-9 px-3" onClick={handleLogout}>
              Sair
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/*" element={<AppShell />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
