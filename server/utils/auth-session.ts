import type { H3Event } from 'h3'
import { decodeSession, type SessionUser } from './session'

export const requireSessionUser = (event: H3Event): SessionUser => {
  const runtimeConfig = useRuntimeConfig()
  const cookie = getCookie(event, 'ff2b_session')

  if (!cookie || !runtimeConfig.sessionPassword) {
    throw createError({ statusCode: 401, statusMessage: 'Session invalide.' })
  }

  const user = decodeSession(cookie, runtimeConfig.sessionPassword)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Session invalide.' })
  }

  return user
}
