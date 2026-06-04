import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useLocation } from 'react-router-dom'
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
import { QuickAddModal } from './components/QuickAddModal'
import { useQuickAddStore } from './store/quickAddStore'

function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, loadMe } = useAuthStore()
  const { open: openQuickAdd } = useQuickAddStore()
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)

  const currentPath = location.pathname

  useEffect(() => {
    loadMe().catch(() => logout())
  }, [loadMe, logout])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="mx-auto flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between max-w-[1400px]">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <Link to="/" className="text-lg font-bold text-white hover:text-emerald-400 transition-colors duration-200">
              Financeiro Pessoal
            </Link>
            <div className="flex items-center gap-2 sm:hidden">
              <div 
                onClick={() => setIsMoreMenuOpen(true)}
                className="h-7 w-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs cursor-pointer active:scale-95 transition-all"
              >
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
            </div>
          </div>
          
          {/* Desktop Navigation Links */}
          <nav className="hidden sm:flex items-center gap-4 text-sm sm:w-auto">
            <Link 
              className={`font-medium transition-colors duration-200 cursor-pointer shrink-0 ${
                currentPath === '/' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-100'
              }`} 
              to="/"
            >
              Dashboard
            </Link>
            <Link 
              className={`font-medium transition-colors duration-200 cursor-pointer shrink-0 ${
                currentPath === '/transactions' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-100'
              }`} 
              to="/transactions"
            >
              Lançamentos
            </Link>
            <Link 
              className={`font-medium transition-colors duration-200 cursor-pointer shrink-0 ${
                currentPath === '/goals' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-100'
              }`} 
              to="/goals"
            >
              Objetivos
            </Link>
            <Link 
              className={`font-medium transition-colors duration-200 cursor-pointer shrink-0 ${
                currentPath === '/categories' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-100'
              }`} 
              to="/categories"
            >
              Categorias
            </Link>
            <Link 
              className={`font-medium transition-colors duration-200 cursor-pointer shrink-0 ${
                currentPath === '/accounts' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-100'
              }`} 
              to="/accounts"
            >
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

      {/* Main Content Area */}
      <main className="mx-auto max-w-[1400px] px-4 py-8 pb-24 sm:pb-8">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="goals" element={<Goals />} />
          <Route path="categories" element={<Categories />} />
          <Route path="accounts" element={<Accounts />} />
        </Routes>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 flex items-center justify-around px-2 z-[95] sm:hidden pb-safe">
        <Link 
          to="/" 
          className={`flex flex-col items-center justify-center w-14 h-full gap-0.5 transition-colors duration-200 ${
            currentPath === '/' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          <span className="text-[10px] font-bold tracking-wide">Início</span>
        </Link>

        <Link 
          to="/transactions" 
          className={`flex flex-col items-center justify-center w-14 h-full gap-0.5 transition-colors duration-200 ${
            currentPath === '/transactions' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <span className="text-[10px] font-bold tracking-wide">Lançamentos</span>
        </Link>

        {/* Floating Action Button (FAB) */}
        <button 
          type="button"
          onClick={() => openQuickAdd('EXPENSE')}
          className="relative -top-4 w-12 h-12 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 border-4 border-slate-950 active:scale-95 transition-all duration-200 focus:outline-none"
        >
          <span className="text-2xl font-bold leading-none">+</span>
        </button>

        <Link 
          to="/goals" 
          className={`flex flex-col items-center justify-center w-14 h-full gap-0.5 transition-colors duration-200 ${
            currentPath === '/goals' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18m-9-9a9 9 0 100 18 9 9 0 000-18zm0 5a4 4 0 100 8 4 4 0 000-8z" />
          </svg>
          <span className="text-[10px] font-bold tracking-wide">Objetivos</span>
        </Link>

        <button 
          type="button"
          onClick={() => setIsMoreMenuOpen(true)}
          className={`flex flex-col items-center justify-center w-14 h-full gap-0.5 transition-colors duration-200 ${
            isMoreMenuOpen ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
          <span className="text-[10px] font-bold tracking-wide">Mais</span>
        </button>
      </nav>

      {/* Slide-up "Mais" Menu Drawer */}
      {isMoreMenuOpen && (
        <div 
          className="fixed inset-0 z-[90] bg-slate-950/80 backdrop-blur-sm sm:hidden animate-in fade-in duration-200"
          onClick={() => setIsMoreMenuOpen(false)}
        >
          <div 
            className="fixed bottom-20 left-4 right-4 bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-sm">
                  {user?.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <span className="text-slate-200 font-bold text-sm">{user?.name}</span>
              </div>
              <button 
                type="button"
                onClick={() => setIsMoreMenuOpen(false)} 
                className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-slate-800 text-slate-400 hover:text-slate-200 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <nav className="flex flex-col gap-2">
              <Link 
                to="/categories" 
                onClick={() => setIsMoreMenuOpen(false)}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/50 hover:bg-slate-950 border border-slate-800/40 hover:border-slate-800 transition-all text-sm font-semibold text-slate-300 hover:text-white"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">🏷️</span>
                  <span>Categorias</span>
                </div>
                <span className="text-slate-500 font-bold">&rarr;</span>
              </Link>
              <Link 
                to="/accounts" 
                onClick={() => setIsMoreMenuOpen(false)}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/50 hover:bg-slate-950 border border-slate-800/40 hover:border-slate-800 transition-all text-sm font-semibold text-slate-300 hover:text-white"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">💳</span>
                  <span>Contas</span>
                </div>
                <span className="text-slate-500 font-bold">&rarr;</span>
              </Link>
            </nav>

            <Button 
              variant="danger" 
              className="w-full h-11 text-sm font-bold bg-red-600 hover:bg-red-500 mt-2" 
              onClick={() => {
                setIsMoreMenuOpen(false)
                handleLogout()
              }}
            >
              Sair da Conta
            </Button>
          </div>
        </div>
      )}

      {/* Global Quick Add Modal */}
      <QuickAddModal />
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
