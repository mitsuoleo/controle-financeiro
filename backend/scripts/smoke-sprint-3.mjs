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

async function requestExpectingError(path, options = {}, expectedStatus) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (response.status !== expectedStatus) {
    const text = await response.text()
    throw new Error(`${options.method ?? 'GET'} ${path} expected ${expectedStatus}, got ${response.status}: ${text}`)
  }
}

async function registerUser(label) {
  const data = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: `Smoke Sprint 3 ${label}`,
      email: `smoke.sprint3.${label}.${timestamp}@local.dev`,
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
    console.log('Iniciando testes de fumaça da Sprint 3 (Contas & Recorrência)...')

    // 1. Cadastrar usuário
    const userSession = await registerUser('test')
    console.log('✔ Usuário registrado com sucesso')

    // 2. Verificar se a conta padrão "Carteira" foi criada
    const accounts = await request('/api/accounts', {
      headers: userSession.headers,
    })

    if (accounts.length !== 1 || accounts[0].name !== 'Carteira' || Number(accounts[0].balance) !== 0) {
      throw new Error('Conta padrão "Carteira" não foi criada corretamente ou saldo inicial não é zero')
    }
    console.log('✔ Conta padrão "Carteira" verificada com saldo zero')

    const walletAccount = accounts[0]

    // 3. Criar uma nova conta "Banco A"
    const bankAccount = await request('/api/accounts', {
      method: 'POST',
      headers: userSession.headers,
      body: JSON.stringify({
        name: 'Banco A',
        type: 'CHECKING',
        color: '#3b82f6',
        balance: 500, // saldo inicial
      }),
    })

    if (bankAccount.name !== 'Banco A' || Number(bankAccount.balance) !== 500) {
      throw new Error('Falha ao criar conta Banco A com saldo inicial')
    }
    console.log('✔ Conta "Banco A" criada com saldo inicial de R$ 500.00')

    // 4. Cadastrar uma receita na conta Banco A
    await request('/api/transactions', {
      method: 'POST',
      headers: userSession.headers,
      body: JSON.stringify({
        type: 'INCOME',
        amount: 50,
        description: 'Venda de item',
        date: new Date().toISOString().slice(0, 10),
        accountId: bankAccount.id,
      }),
    })

    // Verificar se o saldo do Banco A foi atualizado (500 + 50 = 550)
    const accountsAfterIncome = await request('/api/accounts', {
      headers: userSession.headers,
    })
    const updatedBank = accountsAfterIncome.find(a => a.id === bankAccount.id)
    if (Number(updatedBank.balance) !== 550) {
      throw new Error(`Saldo do Banco A deveria ser 550, mas é ${updatedBank.balance}`)
    }
    console.log('✔ Receita adicionada e saldo da conta atualizado para R$ 550.00')

    // 5. Cadastrar uma transferência de R$ 70 do Banco A para a Carteira
    await request('/api/transactions', {
      method: 'POST',
      headers: userSession.headers,
      body: JSON.stringify({
        type: 'TRANSFER',
        amount: 70,
        description: 'Saque para carteira',
        date: new Date().toISOString().slice(0, 10),
        accountId: bankAccount.id,
        destinationAccountId: walletAccount.id,
      }),
    })

    // Verificar saldos após transferência (Banco A = 550 - 70 = 480, Carteira = 0 + 70 = 70)
    const accountsAfterTransfer = await request('/api/accounts', {
      headers: userSession.headers,
    })
    const finalBank = accountsAfterTransfer.find(a => a.id === bankAccount.id)
    const finalWallet = accountsAfterTransfer.find(a => a.id === walletAccount.id)

    if (Number(finalBank.balance) !== 480) {
      throw new Error(`Saldo de origem (Banco A) deveria ser 480, mas é ${finalBank.balance}`)
    }
    if (Number(finalWallet.balance) !== 70) {
      throw new Error(`Saldo de destino (Carteira) deveria ser 70, mas é ${finalWallet.balance}`)
    }
    console.log('✔ Transferência efetuada com sucesso: Banco A = R$ 480.00, Carteira = R$ 70.00')

    // 6. Testar lançamentos recorrentes
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const recRule = await request('/api/recurring-transactions', {
      method: 'POST',
      headers: userSession.headers,
      body: JSON.stringify({
        description: 'Assinatura Teste Diário',
        amount: 15,
        type: 'EXPENSE',
        frequency: 'DAILY',
        startDate: yesterday.toISOString().slice(0, 10),
        accountId: walletAccount.id,
      }),
    })

    if (!recRule.id) {
      throw new Error('Falha ao criar agendamento recorrente')
    }
    console.log('✔ Agendamento recorrente criado com sucesso')

    // Verificar se a transação correspondente à recorrência foi gerada retroativamente
    const transactions = await request('/api/transactions', {
      headers: userSession.headers,
    })
    
    const recTx = transactions.data.find(t => t.description === 'Assinatura Teste Diário')
    if (!recTx) {
      throw new Error('Transação do agendamento recorrente não foi gerada automaticamente')
    }
    console.log(`✔ Transação recorrente gerada automaticamente: R$ ${recTx.amount} na data ${recTx.date.slice(0, 10)}`)

    // Verificar saldo atualizado da Carteira (deve ser 70 - 15 * 2 = 40)
    const accountsAfterRec = await request('/api/accounts', {
      headers: userSession.headers,
    })
    const finalWalletRec = accountsAfterRec.find(a => a.id === walletAccount.id)
    if (Number(finalWalletRec.balance) !== 40) {
      throw new Error(`Saldo final da carteira deveria ser 40, mas é ${finalWalletRec.balance}`)
    }
    console.log('✔ Saldo da carteira deduzido corretamente após geração automática da recorrência')

    // 7. Testar Cartão de Crédito
    // Criar cartão de crédito
    const creditCard = await request('/api/accounts', {
      method: 'POST',
      headers: userSession.headers,
      body: JSON.stringify({
        name: 'Cartão Visa',
        type: 'CREDIT_CARD',
        color: '#ff9900',
        creditLimit: 1000,
      }),
    })

    if (creditCard.type !== 'CREDIT_CARD' || Number(creditCard.creditLimit) !== 1000 || Number(creditCard.balance) !== 0) {
      throw new Error('Falha ao criar cartão de crédito')
    }
    console.log('✔ Cartão de Crédito criado com sucesso: Limite = R$ 1000.00, Saldo = R$ 0.00')

    // Lançar despesa de R$ 250 no cartão
    await request('/api/transactions', {
      method: 'POST',
      headers: userSession.headers,
      body: JSON.stringify({
        type: 'EXPENSE',
        amount: 250,
        description: 'Compra no cartão',
        date: new Date().toISOString().slice(0, 10),
        accountId: creditCard.id,
      }),
    })

    // Verificar saldo (deve ser -250) e status (fatura_paga = false)
    const accountsAfterCardExpense = await request('/api/accounts', {
      headers: userSession.headers,
    })
    const updatedCard = accountsAfterCardExpense.find(a => a.id === creditCard.id)
    if (Number(updatedCard.balance) !== -250 || updatedCard.invoicePaid !== false) {
      throw new Error(`Cartão de crédito deveria ter saldo de -250 e fatura_paga false. Recebido: saldo=${updatedCard.balance}, fatura_paga=${updatedCard.invoicePaid}`)
    }
    console.log('✔ Despesa no cartão registrada: Saldo = R$ -250.00, Fatura Paga = false')

    // Tentar alterar o limite do cartão (deve falhar pois a fatura não está paga!)
    await requestExpectingError(`/api/accounts/${creditCard.id}`, {
      method: 'PUT',
      headers: userSession.headers,
      body: JSON.stringify({
        creditLimit: 1200
      })
    }, 400)
    console.log('✔ Erro esperado capturado: Sistema bloqueou alteração de limite com fatura em aberto')

    // Pagar a fatura do cartão usando o saldo do Banco A (Banco A saldo atual = 480)
    await request(`/api/accounts/${creditCard.id}/pay-invoice`, {
      method: 'POST',
      headers: userSession.headers,
      body: JSON.stringify({
        originAccountId: bankAccount.id
      })
    })

    // Verificar saldos após pagamento de fatura:
    // - Cartão balance deve ser 0 e invoicePaid deve ser true
    // - Banco A balance deve ser 480 - 250 = 230
    const accountsAfterPayment = await request('/api/accounts', {
      headers: userSession.headers,
    })
    const paidCard = accountsAfterPayment.find(a => a.id === creditCard.id)
    const bankAfterPayment = accountsAfterPayment.find(a => a.id === bankAccount.id)

    if (Number(paidCard.balance) !== 0 || paidCard.invoicePaid !== true) {
      throw new Error(`Cartão de crédito pós pagamento deveria ter saldo 0 e fatura_paga true. Recebido: saldo=${paidCard.balance}, fatura_paga=${paidCard.invoicePaid}`)
    }
    if (Number(bankAfterPayment.balance) !== 230) {
      throw new Error(`Conta Banco A deveria ter saldo 230 pós pagamento, mas é ${bankAfterPayment.balance}`)
    }
    console.log('✔ Fatura paga com sucesso: Cartão = R$ 0.00, Fatura Paga = true, Banco A debited R$ 250.00')

    // Tentar alterar o limite do cartão novamente (deve funcionar agora!)
    const updatedLimitCard = await request(`/api/accounts/${creditCard.id}`, {
      method: 'PUT',
      headers: userSession.headers,
      body: JSON.stringify({
        creditLimit: 1200
      })
    })

    if (Number(updatedLimitCard.creditLimit) !== 1200 || updatedLimitCard.invoicePaid !== false) {
      throw new Error(`Limite do cartão deveria ser atualizado para 1200 e invoicePaid setado para false. Recebido: limite=${updatedLimitCard.creditLimit}, invoicePaid=${updatedLimitCard.invoicePaid}`)
    }
    console.log('✔ Limite do cartão alterado com sucesso para R$ 1200.00 pós pagamento')

    console.log('🎉 Todos os testes de fumaça da Sprint 3 (Contas & Recorrência & Cartão de Crédito) passaram com sucesso!')
  } catch (error) {
    console.error('❌ Erro nos testes de fumaça:', error)
    process.exit(1)
  }
}

run()
