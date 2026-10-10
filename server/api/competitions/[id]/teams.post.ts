import { prisma } from "../../../utils/prisma";

export default defineEventHandler(async (event) => {
  const competitionId = Number(getRouterParam(event, "id"));
  const body = await readBody<{ name?: string; person_ids?: string[] }>(event);
  const name = String(body.name ?? "").trim();
  const personIds = [
    ...new Set(
      (Array.isArray(body.person_ids) ? body.person_ids : [])
        .map(String)
        .filter(Boolean),
    ),
  ];
  if (!Number.isInteger(competitionId) || competitionId <= 0)
    throw createError({
      statusCode: 400,
      statusMessage: "Compétition invalide.",
    });
  if (name.length < 2 || name.length > 120)
    throw createError({
      statusCode: 400,
      statusMessage:
        "Le nom de l’équipe doit contenir entre 2 et 120 caractères.",
    });
  if (personIds.length === 0)
    throw createError({
      statusCode: 400,
      statusMessage: "Sélectionne au moins un membre.",
    });

  const competition = await prisma.competitions.findUnique({
    where: { id: competitionId },
    select: { id: true },
  });
  if (!competition)
    throw createError({
      statusCode: 404,
      statusMessage: "Compétition introuvable.",
    });
  const registered = await prisma.competition_participant.findMany({
    where: { competition_id: competitionId, person_id: { in: personIds } },
    select: { person_id: true },
  });
  if (registered.length !== personIds.length)
    throw createError({
      statusCode: 400,
      statusMessage:
        "Tous les membres doivent d’abord être inscrits à la compétition.",
    });

  try {
    return await prisma.team.create({
      data: {
        competition_id: competitionId,
        name,
        team_members: { create: personIds.map((person_id) => ({ person_id })) },
      },
      include: {
        team_members: {
          include: {
            persons: {
              select: { ff2b_id: true, first_name: true, last_name: true },
            },
          },
        },
      },
    });
  } catch (error: any) {
    if (error?.code === "P2002")
      throw createError({
        statusCode: 409,
        statusMessage: "Une équipe porte déjà ce nom dans cette compétition.",
      });
    throw error;
  }
});
