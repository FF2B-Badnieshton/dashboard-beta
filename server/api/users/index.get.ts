import { prisma } from '../../utils/prisma'
import { requireSessionUser } from '../../utils/auth-session'

export default defineEventHandler(async (event) => {
  requireSessionUser(event)

  const users = await prisma.users.findMany({
    orderBy: {
      creation_date: 'desc'
    },
    include: {
      persons: {
        select: {
          ff2b_id: true,
          first_name: true,
          last_name: true,
          email: true
        }
      },
      users_status: {
        select: {
          id: true,
          code: true,
          label: true
        }
      },
      users_roles: {
        include: {
          access_roles: {
            select: {
              id: true,
              code: true,
              label: true
            }
          }
        }
      }
    }
  })

  return users.map(({ password, ...user }) => ({
    ...user,
    password: undefined
  }))
})
