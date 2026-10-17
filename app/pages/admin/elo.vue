<script setup lang="ts">
definePageMeta({ layout: "dashboard", middleware: ["admin-auth"] });

interface EloPlayer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  elo: number | null;
  matches: number;
  lastMatchAt: string | null;
}

const search = ref("");
const { data: players, status, error, refresh } = await useFetch<EloPlayer[]>(
  "/api/elo",
);

const filteredPlayers = computed(() => {
  const query = search.value.trim().toLocaleLowerCase("fr-FR");
  if (!query) return players.value ?? [];

  return (players.value ?? []).filter((player) =>
    `${player.first_name} ${player.last_name} ${player.email}`
      .toLocaleLowerCase("fr-FR")
      .includes(query),
  );
});

function fullName(player: EloPlayer) {
  return `${player.first_name} ${player.last_name}`.trim();
}

function initials(player: EloPlayer) {
  return `${player.first_name[0] ?? ""}${player.last_name[0] ?? ""}`.toUpperCase();
}

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <UPageHeader
        title="Classement ELO"
        description="Consulte la dernière valeur ELO connue pour chaque joueur."
      />
      <UButton
        class="sm:mt-2"
        variant="soft"
        icon="i-lucide-refresh-cw"
        :loading="status === 'pending'"
        @click="refresh()"
      >
        Actualiser
      </UButton>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      title="Impossible de charger le classement ELO"
      :description="error.statusMessage || error.message"
    />

    <div class="grid gap-4 sm:grid-cols-3">
      <UCard>
        <p class="text-sm text-muted">Joueurs classés</p>
        <p class="mt-2 text-3xl font-semibold">{{ players?.length ?? 0 }}</p>
      </UCard>
      <UCard>
        <p class="text-sm text-muted">ELO renseigné</p>
        <p class="mt-2 text-3xl font-semibold">
          {{ players?.filter((player) => player.elo !== null).length ?? 0 }}
        </p>
      </UCard>
      <UCard>
        <p class="text-sm text-muted">Meilleur ELO</p>
        <p class="mt-2 text-3xl font-semibold">
          {{ players?.find((player) => player.elo !== null)?.elo ?? "—" }}
        </p>
      </UCard>
    </div>

    <UCard>
      <div class="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 class="font-semibold">Joueurs</h2>
          <p class="mt-1 text-sm text-muted">
            Les joueurs sont classés par ELO décroissant.
          </p>
        </div>
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Rechercher un joueur…"
          aria-label="Rechercher un joueur"
          class="w-full sm:w-72"
        />
      </div>

      <div v-if="status === 'pending'" class="py-12 text-center text-sm text-muted">
        Chargement du classement…
      </div>
      <div v-else-if="!filteredPlayers.length" class="rounded-xl border border-dashed border-default px-5 py-12 text-center text-sm text-muted">
        Aucun joueur ne correspond à cette recherche.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr class="border-b border-default text-xs uppercase tracking-wide text-muted">
              <th class="px-3 py-3 font-semibold">Rang</th>
              <th class="px-3 py-3 font-semibold">Joueur</th>
              <th class="px-3 py-3 text-right font-semibold">ELO</th>
              <th class="px-3 py-3 text-right font-semibold">Matchs</th>
              <th class="px-3 py-3 text-right font-semibold">Dernier match</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(player, index) in filteredPlayers"
              :key="player.id"
              class="border-b border-default last:border-0"
            >
              <td class="px-3 py-4 font-semibold text-muted">#{{ index + 1 }}</td>
              <td class="px-3 py-4">
                <div class="flex items-center gap-3">
                  <span class="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {{ initials(player) }}
                  </span>
                  <div>
                    <p class="font-semibold">{{ fullName(player) }}</p>
                    <p class="text-xs text-muted">{{ player.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-3 py-4 text-right text-lg font-bold tabular-nums">
                {{ player.elo ?? "—" }}
              </td>
              <td class="px-3 py-4 text-right tabular-nums">{{ player.matches }}</td>
              <td class="px-3 py-4 text-right text-muted">{{ formatDate(player.lastMatchAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </div>
</template>
