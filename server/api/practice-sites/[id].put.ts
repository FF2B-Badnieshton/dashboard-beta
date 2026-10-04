import { prisma } from '../../utils/prisma'

interface PracticeSiteInput {
  name?: string
  municipality_id?: number | null
  address?: string | null
  opening_date?: string | null
  closing_date?: string | null
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isFinite(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Identifiant invalide.'
    })
  }

  const body = await readBody<PracticeSiteInput>(event)

  return prisma.practice_site.update({
    where: { id },
    data: {
      name: body.name?.trim() ?? undefined,
      municipality_id: body.municipality_id ?? undefined,
      address: body.address?.trim() || null,
      opening_date: body.opening_date ? new Date(body.opening_date) : null,
      closing_date: body.closing_date ? new Date(body.closing_date) : null
    }
  })
})
