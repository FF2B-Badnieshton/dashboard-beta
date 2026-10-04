import { prisma } from '../../utils/prisma'
import { hashPassword } from '../../utils/password'
import { throwSessionError } from '../../utils/session-errors'

interface RegisterBody {
  first_name?: string
  last_name?: string
  email?: string
  phone_number?: string
  password?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<RegisterBody>(event)
  const firstName = body.first_name?.trim()
  const lastName = body.last_name?.trim()
  const email = body.email?.trim().toLowerCase()
  const phoneNumber = body.phone_number?.trim()
  const password = body.password?.trim()

  if (!firstName || !lastName || !email || !phoneNumber || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tous les champs sont requis.'
    })
  }

  if (password.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Le mot de passe doit contenir au moins 8 caractères.'
    })
  }

  const runtimeConfig = useRuntimeConfig()

  if (!runtimeConfig.sessionPassword) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Le service d’authentification est mal configuré. Contactez l’administrateur.'
    })
  }

  try {
    const existingUser = await prisma.users.findFirst({ where: { email } })
    const existingPerson = await prisma.persons.findUnique({ where: { email } })

    if (existingUser || existingPerson) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Un compte existe déjà avec cet email.'
      })
    }

    await prisma.$transaction(async (tx) => {
      const person = await tx.persons.create({
        data: {
          first_name: firstName,
          last_name: lastName,
          email,
          phone_number: phoneNumber,
          birthdate: new Date('2000-01-01'),
          contact_origin: 'internet'
        }
      })

      await tx.users.create({
        data: {
          person_id: person.ff2b_id,
          email,
          password: hashPassword(password)
        }
      })
    })

    return { ok: true }
  } catch (error) {
    throwSessionError(error, 'register')
  }
})
