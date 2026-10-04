import { prisma } from '../../utils/prisma'

export default defineEventHandler(async () => {
  return prisma.practice_site.findMany({
    orderBy: { name: 'asc' },
    include: {
      municipalities: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })
})
