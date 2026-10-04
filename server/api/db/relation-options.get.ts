import { Prisma } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { requireSessionUser } from '../../utils/auth-session'

type RelationOption = { label: string, value: string | number }

const scalarTypes = new Set(['String', 'Int', 'BigInt', 'Float', 'Decimal', 'Boolean', 'DateTime'])
const preferredDisplayFields = ['label', 'name', 'title', 'code', 'first_name', 'last_name', 'email']

const asText = (value: unknown) => value instanceof Date ? value.toISOString() : String(value)

export default defineEventHandler(async (event) => {
  requireSessionUser(event)

  const query = getQuery(event)
  const modelName = String(query.model ?? '')
  const fieldName = String(query.field ?? '')
  const model = Prisma.dmmf.datamodel.models.find(entry => entry.name === modelName)
  const field = model?.fields.find(entry => entry.name === fieldName)
  const relation = model?.fields.find(entry =>
    entry.kind === 'object' && entry.relationFromFields?.includes(fieldName)
  )
  const relationIndex = relation?.relationFromFields?.indexOf(fieldName) ?? -1
  const targetFieldName = relationIndex >= 0 ? relation?.relationToFields?.[relationIndex] : undefined
  const targetModel = relation && Prisma.dmmf.datamodel.models.find(entry => entry.name === relation.type)

  if (!model || !field || field.kind === 'object' || !relation || !targetModel || !targetFieldName) {
    throw createError({ statusCode: 400, statusMessage: 'Champ de relation invalide.' })
  }

  const targetField = targetModel.fields.find(entry => entry.name === targetFieldName)
  if (!targetField || !scalarTypes.has(targetField.type)) {
    throw createError({ statusCode: 400, statusMessage: 'Clé de relation invalide.' })
  }

  const displayFields = preferredDisplayFields.filter((name) => {
    const candidate = targetModel.fields.find(entry => entry.name === name)
    return candidate && candidate.kind === 'scalar' && !candidate.isList && name !== targetFieldName
  }).slice(0, 4)
  const select = Object.fromEntries([targetFieldName, ...displayFields].map(name => [name, true]))
  const delegate = (prisma as unknown as Record<string, { findMany: (args: unknown) => Promise<Record<string, unknown>[]> }>)[targetModel.name]

  if (!delegate) {
    throw createError({ statusCode: 500, statusMessage: 'Modèle relationnel indisponible.' })
  }

  const rows = await delegate.findMany({
    select,
    orderBy: displayFields.length ? { [displayFields[0]]: 'asc' } : { [targetFieldName]: 'asc' },
    take: 10000
  })

  const options: RelationOption[] = rows.map((row) => {
    const value = row[targetFieldName] as string | number
    const humanValue = displayFields
      .map(name => row[name])
      .filter(value => value !== null && value !== undefined && value !== '')
      .map(asText)
      .join(' ')
    return { label: humanValue ? `${humanValue} — ${asText(value)}` : asText(value), value }
  })

  return { options }
})
