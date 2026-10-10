import { prisma } from '../../utils/prisma'

export default defineEventHandler(async () => {
  return prisma.competitions.findMany({
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
    include: {
      seasons: true,
      municipalities: true,
      practice_site: true,
      persons: { select: { ff2b_id: true, first_name: true, last_name: true } },
      competition_format: true,
      competition_status: true,
      _count: { select: { games: true, competition_participant: true, team: true } },
    },
  })
})
