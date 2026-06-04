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
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }}>
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-pink-100/80 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between max-w-[1400px]">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <Link to="/" className="text-xl font-bold text-rose-600 hover:text-rose-500 transition-colors duration-200 font-sans tracking-tight">
              Financeiro Pessoal
            </Link>
            <div className="flex items-center gap-2 sm:hidden">
              <div 
                onClick={() => setIsMoreMenuOpen(true)}
                className="h-8 w-8 rounded-full bg-pink-100 border border-pink-200/50 flex items-center justify-center text-pink-600 font-black text-xs cursor-pointer active:scale-95 transition-all"
              >
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
            </div>
          </div>
          
          {/* Desktop Navigation Links */}
          <nav className="hidden sm:flex items-center gap-5 text-sm sm:w-auto">
            <Link 
              className={`font-bold transition-colors duration-200 cursor-pointer shrink-0 ${
                currentPath === '/' ? 'text-pink-600 border-b-2 border-pink-500 pb-0.5' : 'text-slate-500 hover:text-pink-500'
              }`} 
              to="/"
            >
              Dashboard
            </Link>
            <Link 
              className={`font-bold transition-colors duration-200 cursor-pointer shrink-0 ${
                currentPath === '/transactions' ? 'text-pink-600 border-b-2 border-pink-500 pb-0.5' : 'text-slate-500 hover:text-pink-500'
              }`} 
              to="/transactions"
            >
              Lançamentos
            </Link>
            <Link 
              className={`font-bold transition-colors duration-200 cursor-pointer shrink-0 ${
                currentPath === '/goals' ? 'text-pink-600 border-b-2 border-pink-500 pb-0.5' : 'text-slate-500 hover:text-pink-500'
              }`} 
              to="/goals"
            >
              Objetivos
            </Link>
            <Link 
              className={`font-bold transition-colors duration-200 cursor-pointer shrink-0 ${
                currentPath === '/categories' ? 'text-pink-600 border-b-2 border-pink-500 pb-0.5' : 'text-slate-500 hover:text-pink-500'
              }`} 
              to="/categories"
            >
              Categorias
            </Link>
            <Link 
              className={`font-bold transition-colors duration-200 cursor-pointer shrink-0 ${
                currentPath === '/accounts' ? 'text-pink-600 border-b-2 border-pink-500 pb-0.5' : 'text-slate-500 hover:text-pink-500'
              }`} 
              to="/accounts"
            >
              Contas
            </Link>
          </nav>

          <div className="hidden sm:flex items-center gap-4">
            <span className="text-slate-600 font-bold text-sm">{user?.name}</span>
            <Button variant="secondary" className="h-9 px-4 !rounded-xl" onClick={handleLogout}>
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
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-pink-100 flex items-center justify-around px-2 z-[95] sm:hidden pb-safe shadow-[0_-4px_16px_rgba(219,39,119,0.04)]">
        <Link 
          to="/" 
          className={`flex flex-col items-center justify-center w-14 h-full gap-0.5 transition-colors duration-200 ${
            currentPath === '/' ? 'text-pink-600' : 'text-slate-400 hover:text-slate-500'
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
            currentPath === '/transactions' ? 'text-pink-600' : 'text-slate-400 hover:text-slate-500'
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
          className="relative -top-4 w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-pink-500/25 border-4 border-white active:scale-95 transition-all duration-200 focus:outline-none cursor-pointer"
        >
          <span className="text-2xl font-bold leading-none">+</span>
        </button>

        <Link 
          to="/goals" 
          className={`flex flex-col items-center justify-center w-14 h-full gap-0.5 transition-colors duration-200 ${
            currentPath === '/goals' ? 'text-pink-600' : 'text-slate-400 hover:text-slate-500'
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
            isMoreMenuOpen ? 'text-pink-600' : 'text-slate-400 hover:text-slate-500'
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
          className="fixed inset-0 z-[90] bg-slate-950/20 backdrop-blur-sm sm:hidden animate-in fade-in duration-200"
          onClick={() => setIsMoreMenuOpen(false)}
        >
          <div 
            className="fixed bottom-20 left-4 right-4 bg-white border border-pink-100 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-pink-50 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-pink-100 border border-pink-200/50 flex items-center justify-center text-pink-600 font-black text-sm">
                  {user?.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <span className="text-slate-700 font-bold text-sm">{user?.name}</span>
              </div>
              <button 
                type="button"
                onClick={() => setIsMoreMenuOpen(false)} 
                className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-pink-100 text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <nav className="flex flex-col gap-2">
              <Link 
                to="/categories" 
                onClick={() => setIsMoreMenuOpen(false)}
                className="flex items-center justify-between p-3.5 rounded-xl bg-pink-50/20 hover:bg-pink-50/50 border border-pink-100/50 hover:border-pink-200 transition-all text-sm font-semibold text-slate-600 hover:text-pink-600 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">🏷️</span>
                  <span>Categorias</span>
                </div>
                <span className="text-slate-400 font-bold">&rarr;</span>
              </Link>
              <Link 
                to="/accounts" 
                onClick={() => setIsMoreMenuOpen(false)}
                className="flex items-center justify-between p-3.5 rounded-xl bg-pink-50/20 hover:bg-pink-50/50 border border-pink-100/50 hover:border-pink-200 transition-all text-sm font-semibold text-slate-600 hover:text-pink-600 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">💳</span>
                  <span>Contas</span>
                </div>
                <span className="text-slate-400 font-bold">&rarr;</span>
              </Link>
            </nav>

            <Button 
              variant="danger" 
              className="w-full h-11 text-sm font-bold bg-rose-500 hover:bg-rose-600 mt-2" 
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
