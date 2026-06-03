const variants = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-950 active:scale-[0.98] transition-all duration-200 cursor-pointer',
  secondary: 'bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700 focus:ring-slate-500 focus:ring-offset-slate-950 active:scale-[0.98] transition-all duration-200 cursor-pointer',
  danger: 'bg-red-600 text-white hover:bg-red-500 focus:ring-red-500 focus:ring-offset-slate-950 active:scale-[0.98] transition-all duration-200 cursor-pointer',
}

export function Button({ className = '', variant = 'primary', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
