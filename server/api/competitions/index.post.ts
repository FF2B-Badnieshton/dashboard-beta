import { prisma } from '../../utils/prisma'

function positiveInt(value: unknown, field: string): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) throw createError({ statusCode: 400, statusMessage: `${field} est obligatoire.` })
  return parsed
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  const date = String(body.date ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00.000Z`))) {
    throw createError({ statusCode: 400, statusMessage: 'La date de compétition est invalide.' })
  }
  const organizerId = String(body.organizer_id ?? '')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(organizerId)) {
    throw createError({ statusCode: 400, statusMessage: 'Sélectionne un organisateur valide.' })
  }

  const seasonId = positiveInt(body.season_id, 'La saison')
  const locationId = positiveInt(body.location_id, 'La commune')
  const siteId = positiveInt(body.practice_site_id, 'Le site de pratique')
  const formatId = positiveInt(body.format_id, 'Le format')
  const statusId = body.status === '' || body.status == null ? null : positiveInt(body.status, 'Le statut')

  const [season, municipality, site, format, organizer] = await Promise.all([
    prisma.seasons.findUnique({ where: { id: seasonId } }),
    prisma.municipalities.findUnique({ where: { id: locationId } }),
    prisma.practice_site.findUnique({ where: { id: siteId } }),
    prisma.competition_format.findUnique({ where: { id: formatId } }),
    prisma.persons.findUnique({ where: { ff2b_id: organizerId } }),
  ])
  if (!season || !municipality || !site || !format || !organizer) throw createError({ statusCode: 400, statusMessage: 'Une des références sélectionnées n’existe plus.' })
  if (site.municipality_id !== locationId) throw createError({ statusCode: 400, statusMessage: 'Le site choisi ne dépend pas de la commune sélectionnée.' })
  if (statusId !== null && !await prisma.competition_status.findUnique({ where: { id: statusId } })) throw createError({ statusCode: 400, statusMessage: 'Le statut sélectionné est invalide.' })

  return prisma.competitions.create({
    data: {
      season_id: seasonId,
      date: new Date(`${date}T00:00:00.000Z`),
      location_id: locationId,
      practice_site_id: siteId,
      organizer_id: organizerId,
      format_id: formatId,
      status: statusId,
    },
    include: { seasons: true, municipalities: true, practice_site: true, persons: true, competition_format: true, competition_status: true },
  })
})
