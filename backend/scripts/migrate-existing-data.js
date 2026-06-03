import prisma from '../src/config/db.js'

async function run() {
  try {
    console.log('Iniciando migração de dados...')
    
    // 1. Buscar todos os usuários
    const users = await prisma.user.findMany()
    console.log(`Encontrados ${users.length} usuários.`)

    for (const user of users) {
      // 2. Verificar se o usuário já tem alguma conta cadastrada
      let defaultAccount = await prisma.account.findFirst({
        where: { userId: user.id }
      })

      if (!defaultAccount) {
        console.log(`Criando conta padrão "Carteira" para o usuário ${user.name} (${user.email})...`)
        defaultAccount = await prisma.account.create({
          data: {
            userId: user.id,
            name: 'Carteira',
            type: 'CASH',
            color: '#10b981',
            balance: 0.00
          }
        })
      }

      // 3. Buscar transações do usuário que estão sem conta associada
      const transactions = await prisma.transaction.findMany({
        where: {
          userId: user.id,
          accountId: null
        }
      })

      if (transactions.length > 0) {
        console.log(`Vinculando ${transactions.length} transações sem conta para o usuário ${user.name}...`)
        
        // Atualizar transações em lote
        await prisma.transaction.updateMany({
          where: {
            userId: user.id,
            accountId: null
          },
          data: {
            accountId: defaultAccount.id
          }
        })
      }

      // 4. Recalcular saldo total da conta com base nas transações reais
      const allTxs = await prisma.transaction.findMany({
        where: {
          accountId: defaultAccount.id
        }
      })

      let computedBalance = 0.00
      for (const tx of allTxs) {
        const val = Number(tx.amount)
        if (tx.type === 'INCOME') {
          computedBalance += val
        } else if (tx.type === 'EXPENSE') {
          computedBalance -= val
        }
        // Para transferências na migração não se aplica, mas se houvesse, o saldo de origem/destino seria afetado
      }

      await prisma.account.update({
        where: { id: defaultAccount.id },
        data: { balance: computedBalance }
      })
      
      console.log(`Conta "Carteira" do usuário ${user.name} atualizada com saldo de R$ ${computedBalance.toFixed(2)}`)
    }

    console.log('Migração de dados finalizada com sucesso!')
  } catch (error) {
    console.error('Erro durante a migração:', error)
  } finally {
    await prisma.$disconnect()
  }
}

run()
