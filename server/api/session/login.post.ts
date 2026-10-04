import { prisma } from '../../utils/prisma'
import { encodeSession } from '../../utils/session'
import { verifyPassword } from '../../utils/password'

interface LoginBody {
  email?: string
  password?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<LoginBody>(event)

  if (!body.email || !body.password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email et mot de passe requis.'
    })
  }

  const normalizedEmail = body.email.trim().toLowerCase()

  const user = await prisma.users.findFirst({
    where: {
      email: normalizedEmail
    },
    include: {
      persons: true,
      users_roles: {
        include: {
          access_roles: true
        }
      }
    }
  })

  if (!user || !user.persons) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Identifiants invalides.'
    })
  }

  const runtimeConfig = useRuntimeConfig()

  if (!runtimeConfig.sessionPassword || !verifyPassword(body.password, user.password)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Identifiants invalides.'
    })
  }

  const sessionUser = {
    id: user.persons.ff2b_id,
    email: user.email,
    role: user.users_roles[0]?.access_roles?.label ?? 'admin',
    first_name: user.persons.first_name,
    last_name: user.persons.last_name
  }

  setCookie(
    event,
    'ff2b_session',
    encodeSession(sessionUser, runtimeConfig.sessionPassword),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8
    }
  )

  return { ok: true }
})
