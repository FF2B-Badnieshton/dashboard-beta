import { prisma } from '../../utils/prisma'

interface PersonInput {
  first_name?: string
  last_name?: string
  birthdate?: string
  phone_number?: string
  email?: string
  status?: string | null
  contact_origin?: string | null
  address?: string | null
  municipality_id?: number | null
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Identifiant manquant.'
    })
  }

  const body = await readBody<PersonInput>(event)

  return prisma.persons.update({
    where: { ff2b_id: id },
    data: {
      first_name: body.first_name?.trim() ?? undefined,
      last_name: body.last_name?.trim() ?? undefined,
      birthdate: body.birthdate ? new Date(body.birthdate) : undefined,
      phone_number: body.phone_number?.trim() ?? undefined,
      email: body.email?.trim().toLowerCase() ?? undefined,
      status: body.status ?? null,
      contact_origin: body.contact_origin
        ? (body.contact_origin as any)
        : undefined,
      address: body.address?.trim() || null,
      municipality_id: body.municipality_id ?? null
    }
  })
})
