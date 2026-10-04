import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Identifiant manquant.'
    })
  }

  try {
    await prisma.persons.delete({
      where: { ff2b_id: id }
    })

    return { ok: true }
  } catch (error) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'Impossible de supprimer cette personne car des données liées existent encore.'
    })
  }
})
