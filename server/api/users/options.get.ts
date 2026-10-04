import { prisma } from '../../utils/prisma'
import { requireSessionUser } from '../../utils/auth-session'

export default defineEventHandler(async (event) => {
  requireSessionUser(event)

  const [persons, statuses, roles] = await prisma.$transaction([
    prisma.persons.findMany({
      orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
      select: {
        ff2b_id: true,
        first_name: true,
        last_name: true,
        email: true
      }
    }),
    prisma.users_status.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        code: true,
        label: true
      }
    }),
    prisma.access_roles.findMany({
      orderBy: { label: 'asc' },
      select: {
        id: true,
        code: true,
        label: true
      }
    })
  ])

  return { persons, statuses, roles }
})
