import { prisma } from '../../utils/prisma'
import { encodeSession } from '../../utils/session'

interface LoginBody {
  email?: string
  password?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<LoginBody>(event)

  if (!body.email || !body.password) {
    throw createError({ statusCode: 400, statusMessage: 'Email et mot de passe requis.' })
  }

  const person = await prisma.persons.findFirst({
    where: {
      email: body.email
    },
    select: {
      id: true,
      email: true,
      role: true,
      first_name: true,
      last_name: true
    }
  })

  if (!person) {
    throw createError({ statusCode: 401, statusMessage: 'Identifiants invalides.' })
  }

  const runtimeConfig = useRuntimeConfig()

  if (!runtimeConfig.sessionPassword || body.password !== runtimeConfig.dashboardPassword) {
    throw createError({ statusCode: 401, statusMessage: 'Identifiants invalides.' })
  }

  setCookie(event, 'ff2b_session', encodeSession(person, runtimeConfig.sessionPassword), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8
  })

  return { ok: true }
})
