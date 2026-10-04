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
  const body = await readBody<PersonInput>(event)

  if (!body.first_name || !body.last_name || !body.email || !body.birthdate) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Prénom, nom, email et date de naissance requis.'
    })
  }

  return prisma.persons.create({
    data: {
      first_name: body.first_name.trim(),
      last_name: body.last_name.trim(),
      birthdate: new Date(body.birthdate),
      phone_number: body.phone_number?.trim() ?? '',
      email: body.email.trim().toLowerCase(),
      status: body.status ?? null,
      contact_origin: (body.contact_origin as any) ?? 'internet',
      address: body.address?.trim() || null,
      municipality_id: body.municipality_id ?? null
    }
  })
})
