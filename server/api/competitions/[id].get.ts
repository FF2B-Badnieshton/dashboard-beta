import { prisma } from "../../utils/prisma";

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Identifiant de compétition invalide.",
    });
  }

  const competition = await prisma.competitions.findUnique({
    where: { id },
    include: {
      seasons: true,
      municipalities: true,
      practice_site: true,
      persons: {
        select: {
          ff2b_id: true,
          first_name: true,
          last_name: true,
        },
      },
      competition_format: true,
      competition_status: true,

      competition_participant: {
        include: {
          persons: {
            select: {
              ff2b_id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          licenses: {
            include: {
              license_type_licenses_license_typeTolicense_type: true,
            },
          },
          competition_participant_status: true,
          competition_participant_category: true,
        },
        orderBy: { id: "asc" },
      },

      team: {
        include: {
          team_members: {
            include: {
              persons: {
                select: {
                  ff2b_id: true,
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      },

      games: {
        orderBy: { date: "asc" },
        include: {
          game_format: true,
          game_side: {
            include: {
              game_side_result: true,
              game_participant: {
                include: {
                  persons: {
                    select: {
                      ff2b_id: true,
                      first_name: true,
                      last_name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!competition) {
    throw createError({
      statusCode: 404,
      statusMessage: "Compétition introuvable.",
    });
  }

  // Enrichit chaque côté avec ses participants et un libellé.
  // Les personnes sont liées à game_side via game_participant.
  const games = competition.games.map((game) => ({
    ...game,
    game_side: game.game_side.map((side) => {
      const participants = side.game_participant.map((participant) => ({
        ...participant,
        display_name: [
          participant.persons.first_name,
          participant.persons.last_name,
        ]
          .filter(Boolean)
          .join(" "),
      }));

      return {
        ...side,
        participants,
        display_label:
          participants
            .map((participant) => participant.display_name)
            .join(" / ") || `Côté ${side.side_number}`,
      };
    }),
  }));

  return {
    ...competition,
    games,
  };
});
