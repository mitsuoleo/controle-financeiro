const apiUrl = process.env.SMOKE_API_URL ?? 'http://localhost:3333'
const timestamp = Date.now()

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path} failed with ${response.status}: ${text}`)
  }

  return data
}

async function registerUser(label) {
  const data = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: `Smoke Sprint 4 ${label}`,
      email: `smoke.sprint4.${label}.${timestamp}@local.dev`,
      password: '123456',
    }),
  })

  return {
    user: data.user,
    token: data.token,
    headers: { Authorization: `Bearer ${data.token}` },
  }
}

async function run() {
  try {
    console.log('Iniciando testes de fumaça da Sprint 4 (Metas de Economia)...')

    // 1. Cadastrar usuário
    const userSession = await registerUser('test')
    console.log('✔ Usuário registrado com sucesso')

    // 2. Obter conta padrão "Carteira"
    const accounts = await request('/api/accounts', {
      headers: userSession.headers,
    })
    const walletAccount = accounts[0]
    console.log(`✔ Conta padrão "${walletAccount.name}" verificada`)

    // 3. Criar uma meta de economia
    const deadlineDate = new Date()
    deadlineDate.setMonth(deadlineDate.getMonth() + 6)
    const deadlineStr = deadlineDate.toISOString().slice(0, 10)

    const goal = await request('/api/goals', {
      method: 'POST',
      headers: userSession.headers,
      body: JSON.stringify({
        name: 'Viagem de Férias',
        targetAmount: 5000,
        deadline: deadlineStr,
      }),
    })

    if (!goal.id || goal.name !== 'Viagem de Férias' || Number(goal.targetAmount) !== 5000 || Number(goal.currentAmount) !== 0) {
      throw new Error('Falha ao criar meta de economia')
    }
    console.log('✔ Meta "Viagem de Férias" de R$ 5000.00 criada com saldo zero')

    // 4. Cadastrar uma transação de aporte (Despesa com goalId)
    const tx = await request('/api/transactions', {
      method: 'POST',
      headers: userSession.headers,
      body: JSON.stringify({
        type: 'EXPENSE',
        amount: 200.00,
        description: 'Aporte inicial viagem',
        date: new Date().toISOString().slice(0, 10),
        accountId: walletAccount.id,
        goalId: goal.id,
      }),
    })

    if (!tx.id || tx.goalId !== goal.id || Number(tx.amount) !== 200) {
      throw new Error('Falha ao registrar transação de aporte')
    }
    console.log('✔ Transação de aporte de R$ 200.00 registrada no banco')

    // 5. Verificar se os saldos foram sincronizados
    const updatedAccounts = await request('/api/accounts', {
      headers: userSession.headers,
    })
    const updatedWallet = updatedAccounts.find(a => a.id === walletAccount.id)
    if (Number(updatedWallet.balance) !== -200) {
      throw new Error(`Saldo da conta deveria ser -200, mas é ${updatedWallet.balance}`)
    }

    const updatedGoals = await request('/api/goals', {
      headers: userSession.headers,
    })
    const updatedGoal = updatedGoals.find(g => g.id === goal.id)
    if (Number(updatedGoal.currentAmount) !== 200) {
      throw new Error(`Saldo da meta deveria ser 200, mas é ${updatedGoal.currentAmount}`)
    }
    console.log('✔ Saldos da conta (R$ -200.00) e da meta (R$ 200.00) atualizados com sucesso')

    // 6. Atualizar a transação de aporte (mudar valor para R$ 150.00)
    const updatedTx = await request(`/api/transactions/${tx.id}`, {
      method: 'PUT',
      headers: userSession.headers,
      body: JSON.stringify({
        amount: 150.00,
      }),
    })

    if (Number(updatedTx.amount) !== 150) {
      throw new Error('Falha ao atualizar o valor do aporte')
    }

    // Verificar se os saldos foram ajustados após alteração de valor (200 -> 150)
    const accountsAfterEdit = await request('/api/accounts', {
      headers: userSession.headers,
    })
    const walletAfterEdit = accountsAfterEdit.find(a => a.id === walletAccount.id)
    if (Number(walletAfterEdit.balance) !== -150) {
      throw new Error(`Saldo da conta deveria ser -150 após edição, mas é ${walletAfterEdit.balance}`)
    }

    const goalsAfterEdit = await request('/api/goals', {
      headers: userSession.headers,
    })
    const goalAfterEdit = goalsAfterEdit.find(g => g.id === goal.id)
    if (Number(goalAfterEdit.currentAmount) !== 150) {
      throw new Error(`Saldo da meta deveria ser 150 após edição, mas é ${goalAfterEdit.currentAmount}`)
    }
    console.log('✔ Saldos ajustados com sucesso após edição do aporte: Conta = R$ -150.00, Meta = R$ 150.00')

    // 7. Deletar a transação de aporte
    await request(`/api/transactions/${tx.id}`, {
      method: 'DELETE',
      headers: userSession.headers,
    })

    // Verificar se os saldos retornaram ao estado original
    const accountsAfterDelete = await request('/api/accounts', {
      headers: userSession.headers,
    })
    const walletAfterDelete = accountsAfterDelete.find(a => a.id === walletAccount.id)
    if (Number(walletAfterDelete.balance) !== 0) {
      throw new Error(`Saldo da conta deveria ser 0 após deletar aporte, mas é ${walletAfterDelete.balance}`)
    }

    const goalsAfterDelete = await request('/api/goals', {
      headers: userSession.headers,
    })
    const goalAfterDelete = goalsAfterDelete.find(g => g.id === goal.id)
    if (Number(goalAfterDelete.currentAmount) !== 0) {
      throw new Error(`Saldo da meta deveria ser 0 após deletar aporte, mas é ${goalAfterDelete.currentAmount}`)
    }
    console.log('✔ Saldos reconfigurados após exclusão da transação de aporte: Conta = R$ 0.00, Meta = R$ 0.00')

    // 8. Deletar a meta
    await request(`/api/goals/${goal.id}`, {
      method: 'DELETE',
      headers: userSession.headers,
    })

    const finalGoals = await request('/api/goals', {
      headers: userSession.headers,
    })
    const deletedGoalCheck = finalGoals.find(g => g.id === goal.id)
    if (deletedGoalCheck) {
      throw new Error('Meta de economia não foi excluída')
    }
    console.log('✔ Meta excluída com sucesso')

    console.log('🎉 Todos os testes de fumaça da Sprint 4 (Metas de Economia) passaram com sucesso!')
  } catch (error) {
    console.error('❌ Erro nos testes de fumaça da Sprint 4:', error)
    process.exit(1)
  }
}

run()
