import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import './index.css'
import { Button } from './components/ui/Button'
import { ProtectedRoute } from './hooks/useAuth.jsx'
import Dashboard from './pages/Dashboard'
import Categories from './pages/Categories'
import Login from './pages/Login'
import Transactions from './pages/Transactions'
import Accounts from './pages/Accounts'
import Goals from './pages/Goals'
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
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="mx-auto flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between max-w-[1400px]">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <Link to="/" className="text-lg font-bold text-white hover:text-emerald-400 transition-colors duration-200">
              Financeiro Pessoal
            </Link>
            <div className="flex items-center gap-3 sm:hidden">
              <span className="text-slate-300 font-medium text-xs">{user?.name}</span>
              <Button variant="secondary" className="h-8 px-2.5 text-xs" onClick={handleLogout}>
                Sair
              </Button>
            </div>
          </div>
          
          <nav className="flex items-center gap-4 overflow-x-auto no-scrollbar py-0.5 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-x-visible text-sm w-screen sm:w-auto">
            <Link className="font-medium text-slate-400 hover:text-slate-100 transition-colors duration-200 cursor-pointer shrink-0" to="/">
              Dashboard
            </Link>
            <Link className="font-medium text-slate-400 hover:text-slate-100 transition-colors duration-200 cursor-pointer shrink-0" to="/transactions">
              Lançamentos
            </Link>
            <Link className="font-medium text-slate-400 hover:text-slate-100 transition-colors duration-200 cursor-pointer shrink-0" to="/goals">
              Objetivos
            </Link>
            <Link className="font-medium text-slate-400 hover:text-slate-100 transition-colors duration-200 cursor-pointer shrink-0" to="/categories">
              Categorias
            </Link>
            <Link className="font-medium text-slate-400 hover:text-slate-100 transition-colors duration-200 cursor-pointer shrink-0" to="/accounts">
              Contas
            </Link>
          </nav>

          <div className="hidden sm:flex items-center gap-4">
            <span className="text-slate-300 font-medium">{user?.name}</span>
            <Button variant="secondary" className="h-9 px-3" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-8">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="goals" element={<Goals />} />
          <Route path="categories" element={<Categories />} />
          <Route path="accounts" element={<Accounts />} />
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
