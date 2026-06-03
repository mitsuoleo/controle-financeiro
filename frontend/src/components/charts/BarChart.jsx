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
      <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-slate-500">
        <span className="text-3xl">📊</span>
        <p className="text-sm">Sem dados de lançamentos para exibir o gráfico</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RechartsBarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <Tooltip 
          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
          itemStyle={{ color: '#f8fafc' }}
          labelStyle={{ color: '#94a3b8' }}
          cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
          formatter={(value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
        />
        <Bar dataKey="receitas" fill="#16a34a" radius={[6, 6, 0, 0]} />
        <Bar dataKey="despesas" fill="#dc2626" radius={[6, 6, 0, 0]} />
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}

