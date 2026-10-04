import { prisma } from '../../utils/prisma'

interface PracticeSiteInput {
  name?: string
  municipality_id?: number | null
  address?: string | null
  opening_date?: string | null
  closing_date?: string | null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<PracticeSiteInput>(event)

  if (!body.name || !body.municipality_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nom et commune requis.'
    })
  }

  return prisma.practice_site.create({
    data: {
      name: body.name.trim(),
      municipality_id: body.municipality_id,
      address: body.address?.trim() || null,
      opening_date: body.opening_date ? new Date(body.opening_date) : null,
      closing_date: body.closing_date ? new Date(body.closing_date) : null
    }
  })
})
