import { prisma } from "../../../utils/prisma";

type SideInput = { type?: "person" | "team"; id?: string | number };
type GameBody = {
  date?: string;
  format_id?: number | string;
  side1?: SideInput;
  side2?: SideInput;
};

function parseSide(value: SideInput | undefined) {
  const type = value?.type;
  const id = type === "person" ? String(value?.id ?? "") : Number(value?.id);
  if (type !== "person" && type !== "team")
    throw createError({
      statusCode: 400,
      statusMessage: "Type d’adversaire invalide.",
    });
  if (
    (type === "person" && !id) ||
    (type === "team" && (!Number.isInteger(id) || id <= 0))
  )
    throw createError({
      statusCode: 400,
      statusMessage: "Adversaire invalide.",
    });
  return { type, id } as const;
}

export default defineEventHandler(async (event) => {
  const competitionId = Number(getRouterParam(event, "id"));
  const body = await readBody<GameBody>(event);
  const formatId = Number(body.format_id);
  const date = String(body.date ?? "");
  if (!Number.isInteger(competitionId) || competitionId <= 0)
    throw createError({
      statusCode: 400,
      statusMessage: "Compétition invalide.",
    });
  if (!Number.isInteger(formatId) || formatId <= 0)
    throw createError({
      statusCode: 400,
      statusMessage: "Format de match invalide.",
    });
  if (!date || Number.isNaN(Date.parse(date)))
    throw createError({
      statusCode: 400,
      statusMessage: "Date du match invalide.",
    });
  const side1 = parseSide(body.side1);
  const side2 = parseSide(body.side2);
  if (side1.type === side2.type && side1.id === side2.id)
    throw createError({
      statusCode: 400,
      statusMessage: "Les deux côtés doivent être différents.",
    });

  const [competition, format] = await Promise.all([
    prisma.competitions.findUnique({
      where: { id: competitionId },
      select: { id: true },
    }),
    prisma.game_format.findUnique({ where: { id: formatId } }),
  ]);
  if (!competition || !format)
    throw createError({
      statusCode: 404,
      statusMessage: "Compétition ou format introuvable.",
    });

  const resolveSidePeople = async (side: ReturnType<typeof parseSide>) => {
    if (side.type === "person") {
      const registration = await prisma.competition_participant.findFirst({
        where: { competition_id: competitionId, person_id: side.id as string },
        select: { person_id: true, ranking_before: true },
      });
      if (!registration)
        throw createError({
          statusCode: 400,
          statusMessage:
            "Chaque personne jouant un match doit être inscrite à la compétition.",
        });
      return {
        personId: side.id as string,
        teamId: null as number | null,
        people: [
          {
            person_id: registration.person_id,
            ranking_before: registration.ranking_before ?? 0,
          },
        ],
      };
    }
    const team = await prisma.team.findFirst({
      where: { id: side.id as number, competition_id: competitionId },
      include: { team_members: { select: { person_id: true } } },
    });
    if (!team)
      throw createError({
        statusCode: 400,
        statusMessage: "L’équipe doit appartenir à cette compétition.",
      });
    if (!team.team_members.length)
      throw createError({
        statusCode: 400,
        statusMessage: "Cette équipe ne contient aucun membre.",
      });
    const ids = team.team_members.map((member) => member.person_id);
    const registrations = await prisma.competition_participant.findMany({
      where: { competition_id: competitionId, person_id: { in: ids } },
      select: { person_id: true, ranking_before: true },
    });
    if (registrations.length !== ids.length)
      throw createError({
        statusCode: 400,
        statusMessage:
          "Tous les membres de l’équipe doivent être inscrits à la compétition.",
      });
    return {
      personId: null as string | null,
      teamId: team.id,
      people: registrations.map((person) => ({
        person_id: person.person_id,
        ranking_before: person.ranking_before ?? 0,
      })),
    };
  };

  const [resolved1, resolved2] = await Promise.all([
    resolveSidePeople(side1),
    resolveSidePeople(side2),
  ]);
  const allPersonIds = [...resolved1.people, ...resolved2.people].map(
    (person) => person.person_id,
  );
  if (new Set(allPersonIds).size !== allPersonIds.length)
    throw createError({
      statusCode: 400,
      statusMessage:
        "Une personne ne peut pas se trouver des deux côtés du même match.",
    });

  return prisma.$transaction(async (tx) => {
    const game = await tx.games.create({
      data: {
        competition_id: competitionId,
        format_id: formatId,
        date: new Date(date),
      },
    });

    const insertSide = async (
      sideNumber: 1 | 2,
      resolved: typeof resolved1,
    ) => {
      const side = await tx.game_side.create({
        data: {
          game_id: game.id,
          side_number: sideNumber,
        },
      });

      await tx.game_participant.createMany({
        data: resolved.people.map((person) => ({
          game_side_id: side.id,
          person_id: person.person_id,
          ranking_before: person.ranking_before,
        })),
      });
    };

    await insertSide(1, resolved1);
    await insertSide(2, resolved2);
    return game;
  });
});
