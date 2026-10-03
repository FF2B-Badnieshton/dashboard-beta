import { prisma } from '../../utils/prisma'

export default defineEventHandler(async () => {
  return prisma.persons.findMany({
    orderBy: [
      { last_name: 'asc' },
      { first_name: 'asc' }
    ]
  })
})
