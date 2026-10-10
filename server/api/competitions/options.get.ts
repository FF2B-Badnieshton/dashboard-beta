import { prisma } from '../../utils/prisma'

export default defineEventHandler(async () => {
  const [seasons, municipalities, practiceSites, persons, formats, statuses, participantStatuses, participantCategories, gameFormats, licenses] = await Promise.all([
    prisma.seasons.findMany({ orderBy: { start_year: 'desc' }, take: 100 }),
    prisma.municipalities.findMany({ orderBy: [{ name: 'asc' }], take: 3000, select: { id: true, name: true, zip_code: true, insee_code: true } }),
    prisma.practice_site.findMany({ orderBy: { name: 'asc' }, take: 2000, include: { municipalities: { select: { name: true, zip_code: true } } } }),
    prisma.persons.findMany({ orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }], take: 5000, select: { ff2b_id: true, first_name: true, last_name: true, email: true } }),
    prisma.competition_format.findMany({ orderBy: { label: 'asc' } }),
    prisma.competition_status.findMany({ orderBy: { label: 'asc' } }),
    prisma.competition_participant_status.findMany({ orderBy: { label: 'asc' } }),
    prisma.competition_participant_category.findMany({ orderBy: { label: 'asc' } }),
    prisma.game_format.findMany({ orderBy: { label: 'asc' } }),
    prisma.licenses.findMany({
      orderBy: { request_date: 'desc' }, take: 10000,
      select: { id: true, person_id: true, season_id: true, license_status: true, persons: { select: { first_name: true, last_name: true } }, seasons: { select: { start_year: true, end_year: true } } },
    }),
  ])

  return { seasons, municipalities, practiceSites, persons, formats, statuses, participantStatuses, participantCategories, gameFormats, licenses }
})
