import { prisma } from '../../utils/prisma'
import { requireSessionUser } from '../../utils/auth-session'

export default defineEventHandler(async (event) => {
  requireSessionUser(event)

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Identifiant utilisateur manquant.'
    })
  }

  await prisma.users.delete({
    where: { id }
  })

  return { ok: true }
})
