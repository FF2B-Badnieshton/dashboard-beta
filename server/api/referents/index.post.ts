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
  const body = await readBody<ReferentInput>(event)

  if (
    !body.person_id
    || !body.site_id
    || !body.start_date
    || !body.professional_phone
    || !body.professional_mail
  ) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Personne, site, date de début, téléphone et email requis.'
    })
  }

  return prisma.referents.create({
    data: {
      person_id: body.person_id,
      site_id: body.site_id,
      start_date: new Date(body.start_date),
      end_date: body.end_date ? new Date(body.end_date) : null,
      professional_phone: body.professional_phone.trim(),
      professional_mail: body.professional_mail.trim(),
      status: body.status ?? null
    }
  })
})
