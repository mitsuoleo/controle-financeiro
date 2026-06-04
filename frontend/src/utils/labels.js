export const transactionTypeLabels = {
  INCOME: 'Receita',
  EXPENSE: 'Despesa',
  TRANSFER: 'Transferencia',
}

export const categoryTypeLabels = {
  INCOME: 'Receita',
  EXPENSE: 'Despesa',
  BOTH: 'Ambos',
}

export function formatCurrency(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatCurrencyValue(val) {
  if (!val) return ''
  const digits = val.replace(/\D/g, '')
  if (digits.length === 0) return ''
  const cents = parseInt(digits, 10)
  const value = cents / 100
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatRemainingTime(days) {
  if (days < 0) {
    const absDays = Math.abs(days)
    if (absDays >= 365) {
      const years = Math.floor(absDays / 365)
      const months = Math.floor((absDays % 365) / 30)
      if (months > 0) {
        return `Encerrada (${years} ano${years > 1 ? 's' : ''} e ${months} mê${months > 1 ? 'ses' : 's'} atrás)`
      }
      return `Encerrada (${years} ano${years > 1 ? 's' : ''} atrás)`
    }
    if (absDays >= 30) {
      const months = Math.floor(absDays / 30)
      const remainingDays = absDays % 30
      if (remainingDays > 0) {
        return `Encerrada (${months} mê${months > 1 ? 'ses' : 's'} e ${remainingDays} dia${remainingDays > 1 ? 's' : ''} atrás)`
      }
      return `Encerrada (${months} mê${months > 1 ? 'ses' : 's'} atrás)`
    }
    return `Encerrada (${absDays} dia${absDays > 1 ? 's' : ''} atrás)`
  }
  
  if (days === 0) {
    return 'Hoje'
  }
  
  if (days >= 365) {
    const years = Math.floor(days / 365)
    const months = Math.floor((days % 365) / 30)
    
    let result = `${years} ano${years > 1 ? 's' : ''}`
    if (months > 0) {
      result += ` e ${months} mê${months > 1 ? 'ses' : 's'}`
    }
    return result
  }
  
  if (days >= 30) {
    const months = Math.floor(days / 30)
    const remainingDays = days % 30
    
    let result = `${months} mê${months > 1 ? 'ses' : 's'}`
    if (remainingDays > 0) {
      result += ` e ${remainingDays} dia${remainingDays > 1 ? 's' : ''}`
    }
    return result
  }
  
  return `${days} dia${days > 1 ? 's' : ''}`
}

export function formatRemainingTimeShort(days) {
  if (days < 0) return 'Encerrado'
  if (days === 0) return 'Hoje!'
  if (days >= 365) {
    const years = Math.floor(days / 365)
    const months = Math.floor((days % 365) / 30)
    return `${years}a${months > 0 ? ' ' + months + 'm' : ''}`
  }
  if (days >= 30) {
    const months = Math.floor(days / 30)
    const remainingDays = days % 30
    return `${months}m${remainingDays > 0 ? ' ' + remainingDays + 'd' : ''}`
  }
  return `${days}d`
}

export function formatDate(date) {
  if (!date) return '-'
  const d = new Date(date)
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR')
}

export function formatDateShort(date) {
  if (!date) return '-'
  const d = new Date(date)
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

