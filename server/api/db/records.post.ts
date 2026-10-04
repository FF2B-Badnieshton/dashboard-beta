import { Prisma } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { hashPassword } from '../../utils/password'
import { requireSessionUser } from '../../utils/auth-session'

type DbAction
  = | 'findMany'
    | 'findUnique'
    | 'count'
    | 'create'
    | 'update'
    | 'updateMany'
    | 'delete'
    | 'deleteMany'
    | 'upsert'

interface DbRequestBody {
  model?: string
  action?: DbAction
  args?: unknown
}

interface DelegateLike {
  [method: string]: unknown
}

type DmmfField = Prisma.DMMF.Field & { enumValues?: string[] }

const ALLOWED_ACTIONS: readonly DbAction[] = [
  'findMany',
  'findUnique',
  'count',
  'create',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'upsert'
]

const asObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

const getDelegate = (model: string): DelegateLike => {
  const prismaRecord = prisma as unknown as Record<string, unknown>
  const delegate = prismaRecord[model]

  if (!delegate || typeof delegate !== 'object') {
    throw createError({
      statusCode: 400,
      statusMessage: `Modèle Prisma invalide: ${model}`
    })
  }

  return delegate as DelegateLike
}

const getActionMethod = (delegate: DelegateLike, action: DbAction) => {
  const candidate = delegate[action]

  if (typeof candidate !== 'function') {
    throw createError({
      statusCode: 400,
      statusMessage: `Action "${action}" indisponible pour ce modèle`
    })
  }

  return candidate as (args?: unknown) => Promise<unknown>
}

const sanitizePasswords = (value: unknown): unknown => {
  if (typeof value === 'bigint') {
    return value.toString()
  }

  if (Array.isArray(value)) {
    return value.map(sanitizePasswords)
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  const source = value as Record<string, unknown>
  const output: Record<string, unknown> = {}

  for (const [key, fieldValue] of Object.entries(source)) {
    if (key.toLowerCase() === 'password') {
      output[key] = '********'
      continue
    }

    output[key] = sanitizePasswords(fieldValue)
  }

  return output
}

const normalizeUsersPayload = (
  model: string,
  action: DbAction,
  args: Record<string, unknown>
): Record<string, unknown> => {
  if (model !== 'users' || !['create', 'update', 'upsert'].includes(action)) {
    return args
  }

  const patchPasswordField = (dataValue: unknown): unknown => {
    const payload = asObject(dataValue)
    const password = payload.password

    if (typeof password !== 'string' || password.trim().length === 0) {
      return payload
    }

    return {
      ...payload,
      password: hashPassword(password)
    }
  }

  if (action === 'upsert') {
    return {
      ...args,
      create: patchPasswordField(args.create),
      update: patchPasswordField(args.update)
    }
  }

  return {
    ...args,
    data: patchPasswordField(args.data)
  }
}

const getField = (model: string, name: string) => {
  const currentModel = Prisma.dmmf.datamodel.models.find(entry => entry.name === model)
  return currentModel?.fields.find(field => field.name === name) as DmmfField | undefined
}

const coerceValue = (field: DmmfField | undefined, value: unknown): unknown => {
  if (value === null || value === undefined || value === '') return value === '' && field?.isRequired ? value : null
  if (!field || (field.kind !== 'scalar' && field.kind !== 'enum')) return value

  switch (field.type) {
    case 'Int':
    case 'BigInt':
      return Number(value)
    case 'Float':
      return Number(value)
    case 'Decimal':
      return String(value)
    case 'Boolean':
      return value === true || value === 'true' || value === 1 || value === '1'
    case 'DateTime':
      return new Date(String(value))
    default:
      return value
  }
}

const normalizeObject = (model: string, value: unknown, mode: 'data' | 'where') => {
  const source = asObject(value)
  const output: Record<string, unknown> = {}

  for (const [key, rawValue] of Object.entries(source)) {
    const field = getField(model, key)
    if (!field || field.kind === 'object' || (mode === 'data' && field.isId)) continue
    output[key] = coerceValue(field, rawValue)
  }

  return output
}

const normalizeArgs = (model: string, action: DbAction, args: Record<string, unknown>) => {
  const output = { ...args }
  if ('where' in output) output.where = normalizeObject(model, output.where, 'where')
  if (action === 'create' || action === 'update' || action === 'updateMany') {
    output.data = normalizeObject(model, output.data, 'data')
  }
  if (action === 'upsert') {
    output.create = normalizeObject(model, output.create, 'data')
    output.update = normalizeObject(model, output.update, 'data')
    output.where = normalizeObject(model, output.where, 'where')
  }
  return output
}

export default defineEventHandler(async (event) => {
  requireSessionUser(event)

  const body = await readBody<DbRequestBody>(event)
  const model = body.model?.trim()

  if (!model) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Le nom du modèle est requis.'
    })
  }

  const knownModel = Prisma.dmmf.datamodel.models.find(
    entry => entry.name === model
  )

  if (!knownModel) {
    throw createError({
      statusCode: 400,
      statusMessage: `Modèle Prisma inconnu: ${model}`
    })
  }

  if (!body.action || !ALLOWED_ACTIONS.includes(body.action)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Action CRUD invalide.'
    })
  }

  const delegate = getDelegate(model)
  const actionMethod = getActionMethod(delegate, body.action)
  const args = normalizeArgs(model, body.action, normalizeUsersPayload(model, body.action, asObject(body.args)))

  if (body.action === 'findMany') {
    const findManyArgs = {
      ...args,
      take: typeof args.take === 'number' ? Math.min(args.take, 200) : 50
    }
    const records = await actionMethod(findManyArgs)
    return sanitizePasswords(records)
  }

  const result = await actionMethod(args)
  return sanitizePasswords(result)
})
