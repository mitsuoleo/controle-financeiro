import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'

export function useTransactions(filters = {}) {
  const [transactions, setTransactions] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    const { data } = await api.get('/transactions', { params: filters })
    setTransactions(data.data)
    setMeta(data.meta)
    setLoading(false)
  }, [filters])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  return { transactions, meta, loading, refresh: fetchTransactions }
}
