import { prisma } from '../../utils/prisma'
import { hashPassword } from '../../utils/password'
import { requireSessionUser } from '../../utils/auth-session'

interface UpdateUserBody {
  person_id?: string
  email?: string
  password?: string
  statut?: number | null
  role_ids?: number[]
}

export default defineEventHandler(async (event) => {
  requireSessionUser(event)

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Identifiant utilisateur manquant.'
    })
  }

  const body = await readBody<UpdateUserBody>(event)
  const roleIds = body.role_ids
    ? Array.from(
        new Set(body.role_ids.filter(value => Number.isInteger(value)))
      )
    : null

  const data: {
    person_id?: string
    email?: string
    password?: string
    statut?: number | null
  } = {}

  if (typeof body.person_id === 'string') {
    data.person_id = body.person_id
  }

  if (typeof body.email === 'string') {
    data.email = body.email.trim().toLowerCase()
  }

  if (typeof body.password === 'string' && body.password.trim().length > 0) {
    if (body.password.trim().length < 8) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Le mot de passe doit contenir au moins 8 caractères.'
      })
    }
    data.password = hashPassword(body.password.trim())
  }

  if (body.statut === null || typeof body.statut === 'number') {
    data.statut = body.statut
  }

  const user = await prisma.$transaction(async (tx) => {
    await tx.users.update({
      where: { id },
      data
    })

    if (roleIds) {
      await tx.users_roles.deleteMany({
        where: { user_id: id }
      })

      if (roleIds.length > 0) {
        await tx.users_roles.createMany({
          data: roleIds.map(role_id => ({
            role_id,
            user_id: id
          })),
          skipDuplicates: true
        })
      }
    }

    return tx.users.findUnique({
      where: { id },
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
      statusCode: 404,
      statusMessage: 'Utilisateur introuvable.'
    })
  }

  const { password, ...safeUser } = user
  return safeUser
})
