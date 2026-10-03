import { createHmac, timingSafeEqual } from 'node:crypto'

interface SessionUser {
  id: string
  email: string
  role: string
  first_name: string | null
  last_name: string | null
}

const encode = (value: string) => Buffer.from(value).toString('base64url')
const decode = (value: string) => Buffer.from(value, 'base64url').toString('utf-8')

const sign = (payload: string, secret: string) => {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export const encodeSession = (user: SessionUser, secret: string) => {
  const payload = encode(JSON.stringify(user))
  const signature = sign(payload, secret)
  return `${payload}.${signature}`
}

export const decodeSession = (cookie: string, secret: string) => {
  const [payload, signature] = cookie.split('.')

  if (!payload || !signature) {
    return null
  }

  const expectedSignature = sign(payload, secret)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null
  }

  return JSON.parse(decode(payload)) as SessionUser
}
