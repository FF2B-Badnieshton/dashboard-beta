import { requireSessionUser } from '../../utils/auth-session'

export default defineEventHandler((event) => {
  return requireSessionUser(event)
})
