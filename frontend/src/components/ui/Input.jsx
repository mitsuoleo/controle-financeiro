export function Input({ label, className = '', ...props }) {
  return (
    <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
      {label}
      <input
        className={`w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/15 ${className}`}
        {...props}
      />
    </label>
  )
}
