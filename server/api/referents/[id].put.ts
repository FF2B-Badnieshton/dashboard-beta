import { prisma } from '../../utils/prisma'

interface ReferentInput {
  person_id?: string
  site_id?: number | null
  start_date?: string
  end_date?: string | null
  professional_phone?: string
  professional_mail?: string
  status?: number | null
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isFinite(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Identifiant invalide.'
    })
  }

  const body = await readBody<ReferentInput>(event)

  return prisma.referents.update({
    where: { id },
    data: {
      person_id: body.person_id ?? undefined,
      site_id: body.site_id ?? undefined,
      start_date: body.start_date ? new Date(body.start_date) : undefined,
      end_date: body.end_date ? new Date(body.end_date) : null,
      professional_phone: body.professional_phone?.trim() ?? undefined,
      professional_mail: body.professional_mail?.trim() ?? undefined,
      status: body.status ?? null
    }
  })
})
