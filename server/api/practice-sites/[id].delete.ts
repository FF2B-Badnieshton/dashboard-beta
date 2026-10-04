import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isFinite(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Identifiant invalide.'
    })
  }

  try {
    await prisma.practice_site.delete({ where: { id } })
    return { ok: true }
  } catch (error) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Impossible de supprimer ce site car des données liées existent encore.'
    })
  }
})
