import { prisma } from '../../utils/prisma'

export default defineEventHandler(async () => {
  return prisma.referents.findMany({
    orderBy: [{ start_date: 'desc' }, { id: 'asc' }],
    include: {
      persons: {
        select: {
          ff2b_id: true,
          first_name: true,
          last_name: true,
          email: true
        }
      },
      practice_site: {
        select: {
          id: true,
          name: true
        }
      },
      referent_status: {
        select: {
          id: true,
          label: true
        }
      }
    }
  })
})
