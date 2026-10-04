import { prisma } from '../../utils/prisma'
import { hashPassword } from '../../utils/password'
import { requireSessionUser } from '../../utils/auth-session'

interface CreateUserBody {
  person_id?: string
  email?: string
  password?: string
  statut?: number | null
  role_ids?: number[]
}

export default defineEventHandler(async (event) => {
  requireSessionUser(event)

  const body = await readBody<CreateUserBody>(event)

  if (!body.person_id || !body.email || !body.password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'person_id, email et mot de passe sont requis.'
    })
  }

  const normalizedEmail = body.email.trim().toLowerCase()
  const normalizedPassword = body.password.trim()

  if (normalizedPassword.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Le mot de passe doit contenir au moins 8 caractères.'
    })
  }

  const roleIds = Array.from(
    new Set((body.role_ids ?? []).filter(id => Number.isInteger(id)))
  )

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.users.create({
      data: {
        person_id: body.person_id as string,
        email: normalizedEmail,
        password: hashPassword(normalizedPassword),
        statut: body.statut ?? null
      }
    })

    if (roleIds.length > 0) {
      await tx.users_roles.createMany({
        data: roleIds.map(role_id => ({
          role_id,
          user_id: created.id
        })),
        skipDuplicates: true
      })
    }

    return tx.users.findUnique({
      where: { id: created.id },
      include: {
        persons: true,
        users_status: true,
        users_roles: {
          include: {
            access_roles: true
          }
        }
      }
    })
  })

  if (!user) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Utilisateur introuvable après création.'
    })
  }

  const { password, ...safeUser } = user
  return safeUser
})
