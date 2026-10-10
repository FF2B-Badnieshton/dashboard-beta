import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const competitionId = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(competitionId) || competitionId <= 0) throw createError({ statusCode: 400, statusMessage: 'Compétition invalide.' })
  return prisma.games.findMany({
    where: { competition_id: competitionId },
    orderBy: { date: 'asc' },
    include: {
      game_format: true,
      game_side: {
        orderBy: { side_number: 'asc' },
        include: {
          game_side_result: true,
          game_participant: { include: { persons: { select: { ff2b_id: true, first_name: true, last_name: true } } } },
        },
      },
    },
  })
})
