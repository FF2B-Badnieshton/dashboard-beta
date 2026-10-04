import { prisma } from '../../utils/prisma'

export default defineEventHandler(async () => {
  return prisma.persons.findMany({
    orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
    select: {
      ff2b_id: true,
      first_name: true,
      last_name: true,
      birthdate: true,
      phone_number: true,
      email: true,
      status: true,
      contact_origin: true,
      address: true,
      municipality_id: true
    }
  })
})
