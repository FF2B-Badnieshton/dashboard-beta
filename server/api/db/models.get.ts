import { Prisma } from '@prisma/client'
import { requireSessionUser } from '../../utils/auth-session'

const toField = (model: Prisma.DMMF.Model, field: Prisma.DMMF.Field) => {
  const relation = model.fields.find(candidate =>
    candidate.kind === 'object' && candidate.relationFromFields?.includes(field.name)
  )
  const relationIndex = relation?.relationFromFields?.indexOf(field.name) ?? -1

  return {
    name: field.name,
    kind: field.kind,
    type: field.type,
    isRequired: field.isRequired,
    isList: field.isList,
    isId: field.isId,
    isUnique: field.isUnique,
    hasDefaultValue: Boolean(field.hasDefaultValue),
    relationName: field.relationName ?? null,
    relationFromFields: field.relationFromFields ?? [],
    relationToFields: field.relationToFields ?? [],
    enumValues: (field as Prisma.DMMF.Field & { enumValues?: string[] }).enumValues ?? null,
    relationModel: relation?.type ?? null,
    relationToField: relationIndex >= 0 ? relation?.relationToFields?.[relationIndex] ?? null : null
  }
}

export default defineEventHandler(async (event) => {
  requireSessionUser(event)

  const models = Prisma.dmmf.datamodel.models.map((model) => {
    const idFields = model.fields
      .filter(field => field.isId)
      .map(field => field.name)

    return {
      name: model.name,
      dbName: model.dbName ?? null,
      idFields,
      fields: model.fields.map(field => toField(model, field))
    }
  })

  return models
})
