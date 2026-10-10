import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const competitionId = Number(getRouterParam(event, 'id'))
  const body = await readBody<Record<string, unknown>>(event)
  const personId = String(body.person_id ?? '')
  const licenseId = String(body.license_id ?? '')
  const status = Number(body.status)
  const category = Number(body.category)
  if (!Number.isInteger(competitionId) || competitionId <= 0) throw createError({ statusCode: 400, statusMessage: 'Compétition invalide.' })
  if (!personId || !licenseId || !Number.isInteger(status) || status <= 0 || !Number.isInteger(category) || category <= 0) throw createError({ statusCode: 400, statusMessage: 'Personne, licence, statut et catégorie sont obligatoires.' })

  const [competition, person, license, participantStatus, participantCategory, duplicate] = await Promise.all([
    prisma.competitions.findUnique({ where: { id: competitionId }, select: { id: true, season_id: true } }),
    prisma.persons.findUnique({ where: { ff2b_id: personId }, select: { ff2b_id: true } }),
    prisma.licenses.findUnique({ where: { id: licenseId }, select: { id: true, person_id: true, season_id: true } }),
    prisma.competition_participant_status.findUnique({ where: { id: status } }),
    prisma.competition_participant_category.findUnique({ where: { id: category } }),
    prisma.competition_participant.findFirst({ where: { competition_id: competitionId, person_id: personId }, select: { id: true } }),
  ])
  if (!competition) throw createError({ statusCode: 404, statusMessage: 'Compétition introuvable.' })
  if (!person || !license || license.person_id !== personId) throw createError({ statusCode: 400, statusMessage: 'La licence ne correspond pas à cette personne.' })
  if (license.season_id !== competition.season_id) throw createError({ statusCode: 400, statusMessage: 'La licence doit appartenir à la saison de la compétition.' })
  if (!participantStatus || !participantCategory) throw createError({ statusCode: 400, statusMessage: 'Statut ou catégorie invalide.' })
  if (duplicate) throw createError({ statusCode: 409, statusMessage: 'Cette personne est déjà inscrite à la compétition.' })

  return prisma.competition_participant.create({ data: { competition_id: competitionId, person_id: personId, license_id: licenseId, status, category } })
})
