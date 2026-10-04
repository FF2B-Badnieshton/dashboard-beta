import { Prisma } from '@prisma/client'
import { randomUUID } from 'node:crypto'

type SessionOperation = 'register' | 'login'

const isHttpError = (error: unknown): error is { statusCode: number } => {
  return typeof error === 'object'
    && error !== null
    && 'statusCode' in error
    && typeof error.statusCode === 'number'
}

/**
 * Converts low-level Prisma failures into safe, actionable API errors.
 * The database error itself is logged server-side, never returned to clients.
 */
export const throwSessionError = (
  error: unknown,
  operation: SessionOperation
): never => {
  if (isHttpError(error)) {
    throw error
  }

  const reference = randomUUID().slice(0, 8)
  console.error(`[session:${operation}] ${reference}`, error)

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Un compte existe déjà avec ces informations.'
      })
    }

    if (error.code === 'P2021' || error.code === 'P2022') {
      throw createError({
        statusCode: 503,
        statusMessage: `La base de données n’est pas à jour. Référence : ${reference}.`
      })
    }
  }

  if (
    error instanceof Prisma.PrismaClientInitializationError
    || error instanceof Prisma.PrismaClientRustPanicError
  ) {
    throw createError({
      statusCode: 503,
      statusMessage: `La base de données est momentanément indisponible. Référence : ${reference}.`
    })
  }

  throw createError({
    statusCode: 500,
    statusMessage: `Le serveur n’a pas pu traiter la demande. Référence : ${reference}.`
  })
}
