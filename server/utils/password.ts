import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const SCRYPT_KEY_LENGTH = 64

export const hashPassword = (password: string): string => {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString('hex')
  return `scrypt:${salt}:${hash}`
}

export const verifyPassword = (
  password: string,
  hashedPassword: string
): boolean => {
  const [algorithm, salt, storedHash] = hashedPassword.split(':')

  if (algorithm !== 'scrypt' || !salt || !storedHash) {
    const incoming = Buffer.from(password)
    const stored = Buffer.from(hashedPassword)

    if (incoming.length !== stored.length) {
      return false
    }

    return timingSafeEqual(incoming, stored)
  }

  const candidateHash = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString(
    'hex'
  )

  const incoming = Buffer.from(candidateHash, 'hex')
  const stored = Buffer.from(storedHash, 'hex')

  if (incoming.length !== stored.length) {
    return false
  }

  return timingSafeEqual(incoming, stored)
}
