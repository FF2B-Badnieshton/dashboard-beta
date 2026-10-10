import { prisma } from "../../../utils/prisma";

export default defineEventHandler(async (event) => {
  const gameId = Number(getRouterParam(event, "id"));
  const body = await readBody<{
    side1_scored?: number;
    side2_scored?: number;
  }>(event);

  const side1Scored = Number(body.side1_scored);
  const side2Scored = Number(body.side2_scored);

  if (!Number.isInteger(gameId) || gameId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Match invalide.",
    });
  }

  if (
    !Number.isInteger(side1Scored) ||
    side1Scored < 0 ||
    !Number.isInteger(side2Scored) ||
    side2Scored < 0
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Les scores doivent être des entiers positifs ou nuls.",
    });
  }

  return prisma.$transaction(async (tx) => {
    const game = await tx.games.findUnique({
      where: { id: gameId },
      include: {
        game_side: {
          orderBy: { side_number: "asc" },
          select: {
            id: true,
            side_number: true,
          },
        },
      },
    });

    if (!game || game.game_side.length !== 2) {
      throw createError({
        statusCode: 404,
        statusMessage: "Match ou côtés du match introuvables.",
      });
    }

    const first = game.game_side.find((side) => side.side_number === 1);
    const second = game.game_side.find((side) => side.side_number === 2);

    if (!first || !second) {
      throw createError({
        statusCode: 500,
        statusMessage: "Le match doit posséder un côté 1 et un côté 2.",
      });
    }

    // 1 = victoire, 0 = égalité, -1 = défaite.
    const side1Result =
      side1Scored > side2Scored ? 1 : side1Scored < side2Scored ? 3 : 2;

    const side2Result =
      side2Scored > side1Scored ? 1 : side2Scored < side1Scored ? 3 : 2;

    await tx.$executeRaw`
      INSERT INTO "game_side_result" (
        "game_side_id",
        "nieshs_scored",
        "nieshs_conceded",
        "result"
      )
      VALUES (
        ${first.id},
        ${side1Scored},
        ${side2Scored},
        ${side1Result}
      )
      ON CONFLICT ("game_side_id")
      DO UPDATE SET
        "nieshs_scored" = EXCLUDED."nieshs_scored",
        "nieshs_conceded" = EXCLUDED."nieshs_conceded",
        "result" = EXCLUDED."result"
    `;

    await tx.$executeRaw`
      INSERT INTO "game_side_result" (
        "game_side_id",
        "nieshs_scored",
        "nieshs_conceded",
        "result"
      )
      VALUES (
        ${second.id},
        ${side2Scored},
        ${side1Scored},
        ${side2Result}
      )
      ON CONFLICT ("game_side_id")
      DO UPDATE SET
        "nieshs_scored" = EXCLUDED."nieshs_scored",
        "nieshs_conceded" = EXCLUDED."nieshs_conceded",
        "result" = EXCLUDED."result"
    `;

    return {
      gameId,
      side1: {
        scored: side1Scored,
        conceded: side2Scored,
        result: side1Result,
      },
      side2: {
        scored: side2Scored,
        conceded: side1Scored,
        result: side2Result,
      },
    };
  });
});
