import { prisma } from '../../utils/prisma'

export default defineEventHandler(async () => {
  return prisma.municipalities.findMany({
    orderBy: {
      name: 'asc'
    },
    select: {
      id: true,
      name: true
    }
  })
})
