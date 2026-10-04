import { prisma } from '../../utils/prisma'
import { requireSessionUser } from '../../utils/auth-session'

export default defineEventHandler(async (event) => {
  requireSessionUser(event)

  const [persons, sites, referents, licenses, payments, pendingPayments] = await Promise.all([
    prisma.persons.count(),
    prisma.practice_site.count(),
    prisma.referents.count(),
    prisma.licenses.count(),
    prisma.payments.count(),
    prisma.payments.count({ where: { payment_status: 'en_attente' } })
  ])

  return { persons, sites, referents, licenses, payments, pendingPayments }
})
