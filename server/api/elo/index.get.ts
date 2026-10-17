import { prisma } from "../../utils/prisma";

type RankingRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  elo: number | null;
  matches: number;
  lastMatchAt: Date | null;
};

export default defineEventHandler(async () => {
  const participants = await prisma.game_participant.findMany({
    include: {
      persons: {
        select: {
          ff2b_id: true,
          first_name: true,
          last_name: true,
          email: true,
        },
      },
      game_side: {
        select: {
          games: {
            select: {
              date: true,
            },
          },
        },
      },
    },
  });

  const ranking = new Map<string, RankingRow>();

  for (const participant of participants) {
    const person = participant.persons;
    const current = ranking.get(person.ff2_id);
    const matchDate = participant.game_side.games.date;
    const elo = participant.elo_after ?? participant.elo_before ?? null;

    if (!current) {
      ranking.set(person.ff2_id, {
        id: person.ff2_id,
        first_name: person.first_name,
        last_name: person.last_name,
        email: person.email,
        elo,
        matches: 1,
        lastMatchAt: matchDate,
      });
      continue;
    }

    current.matches += 1;
    if (matchDate > (current.lastMatchAt ?? new Date(0))) {
      current.lastMatchAt = matchDate;
      current.elo = elo;
    }
  }

  return [...ranking.values()].sort((a, b) => {
    if (a.elo === null && b.elo !== null) return 1;
    if (a.elo !== null && b.elo === null) return -1;
    if (a.elo !== b.elo) return (b.elo ?? 0) - (a.elo ?? 0);
    return `${a.last_name} ${a.first_name}`.localeCompare(
      `${b.last_name} ${b.first_name}`,
      "fr",
    );
  });
});
