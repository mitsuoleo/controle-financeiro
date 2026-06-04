import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export function MonthlyBarChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-slate-400">
        <svg className="w-8 h-8 text-pink-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-sm font-semibold">Sem dados de lançamentos para exibir o gráfico</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RechartsBarChart data={data}>
        <defs>
          <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.95}/>
            <stop offset="95%" stopColor="#059669" stopOpacity={0.7}/>
          </linearGradient>
          <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.95}/>
            <stop offset="95%" stopColor="#e11d48" stopOpacity={0.7}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(219, 39, 119, 0.06)" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#9c8e92', fontSize: 11, fontWeight: 'bold' }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: '#9c8e92', fontSize: 11, fontWeight: 'bold' }} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#ffffff', 
            borderColor: '#f3e8eb', 
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(219, 39, 119, 0.06)',
            fontFamily: 'Quicksand, sans-serif'
          }}
          itemStyle={{ color: '#3d2e32', fontSize: '12px', fontWeight: 'bold' }}
          labelStyle={{ color: '#9c8e92', fontSize: '11px', fontWeight: 'bold' }}
          cursor={{ fill: 'rgba(219, 39, 119, 0.02)' }}
          formatter={(value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
        />
        <Bar dataKey="receitas" fill="url(#colorReceitas)" radius={[6, 6, 0, 0]} />
        <Bar dataKey="despesas" fill="url(#colorDespesas)" radius={[6, 6, 0, 0]} />
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
