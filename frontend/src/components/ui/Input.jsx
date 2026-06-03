export function Input({ label, className = '', ...props }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-300">
      {label}
      <input
        className={`h-10 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${className}`}
        {...props}
      />
    </label>
  )
}
