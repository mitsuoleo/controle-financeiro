const variants = {
  primary: 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/10 hover:shadow-lg hover:shadow-pink-500/20 focus:ring-pink-500 focus:ring-offset-white active:scale-[0.97] transition-all duration-200 cursor-pointer border-none',
  secondary: 'bg-white text-rose-600 border border-pink-200 hover:bg-rose-50/50 hover:border-pink-300 focus:ring-pink-400 focus:ring-offset-white active:scale-[0.97] transition-all duration-200 cursor-pointer',
  danger: 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/10 hover:shadow-lg hover:shadow-rose-500/20 focus:ring-rose-500 focus:ring-offset-white active:scale-[0.97] transition-all duration-200 cursor-pointer border-none',
}

export function Button({ className = '', variant = 'primary', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
