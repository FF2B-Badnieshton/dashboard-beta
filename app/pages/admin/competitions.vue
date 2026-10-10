<script setup lang="ts">
type Id = number | string;

interface PersonOption {
  ff2b_id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

interface LicenseOption {
  id: string;
  person_id: string;
  season_id: number;
  license_status: string;
  persons: PersonOption;
  seasons: { start_year: number; end_year: number };
}

interface OptionsData {
  seasons: any[];
  municipalities: any[];
  practiceSites: any[];
  persons: PersonOption[];
  formats: any[];
  statuses: any[];
  participantStatuses: any[];
  participantCategories: any[];
  gameFormats: any[];
  licenses: LicenseOption[];
}

interface Competition {
  id: number;
  season_id: number;
  date: string;
  location_id: number;
  practice_site_id: number;
  organizer_id: string;
  format_id: number;
  status: number | null;
  [key: string]: any;
}

const { data: options, error: optionsError } = await useFetch<OptionsData>(
  "/api/competitions/options",
);

const competitions = ref<Competition[]>([]);
const detail = ref<any | null>(null);
const selectedCompetitionId = ref<number | null>(null);
const busy = ref(false);
const pageError = ref("");
const pageSuccess = ref("");

// Filtres d’interface pour retrouver rapidement une compétition ou un match.
const competitionSearch = ref("");
const participantSearch = ref("");
const gameSearch = ref("");
const gameFilter = ref<"all" | "pending" | "finished">("all");
const editingGameId = ref<number | null>(null);

const activeSection = ref<"overview" | "participants" | "teams" | "games">(
  "overview",
);

const newCompetition = reactive({
  season_id: "",
  date: new Date().toISOString().slice(0, 10),
  location_id: "",
  practice_site_id: "",
  organizer_id: "",
  format_id: "",
  status: "",
});

const participantForm = reactive({
  person_id: "",
  license_id: "",
  status: "",
  category: "",
});

const teamForm = reactive({
  name: "",
  person_ids: [] as string[],
});

const gameForm = reactive({
  date: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
  format_id: "",
  side1: "",
  side2: "",
});

const scoreDrafts = reactive<Record<number, { side1: number; side2: number }>>(
  {},
);

const allOptions = computed(() => options.value);
const people = computed(() => allOptions.value?.persons ?? []);

const availableLicenses = computed(() => {
  if (!participantForm.person_id) return [];

  const seasonId = detail.value?.season_id;

  return (allOptions.value?.licenses ?? []).filter(
    (license) =>
      license.person_id === participantForm.person_id &&
      (!seasonId || license.season_id === seasonId),
  );
});

const registeredParticipants = computed(
  () => detail.value?.competition_participant ?? [],
);

const teams = computed(() => detail.value?.team ?? []);
const games = computed(() => detail.value?.games ?? []);

const filteredCompetitions = computed(() => {
  const query = competitionSearch.value.trim().toLocaleLowerCase("fr-FR");
  if (!query) return competitions.value;

  return competitions.value.filter((competition: any) => {
    const searchable = [
      competition.competition_format?.label,
      competition.municipalities?.name,
      competition.seasons?.start_year,
      competition.seasons?.end_year,
      competition.competition_status?.label,
      competition.id,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("fr-FR");

    return searchable.includes(query);
  });
});

const filteredParticipants = computed(() => {
  const query = participantSearch.value.trim().toLocaleLowerCase("fr-FR");
  if (!query) return registeredParticipants.value;

  return registeredParticipants.value.filter((participant: any) => {
    const searchable = [
      participant.persons?.first_name,
      participant.persons?.last_name,
      participant.persons?.email,
      participant.competition_participant_status?.label,
      participant.competition_participant_category?.label,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("fr-FR");

    return searchable.includes(query);
  });
});

function hasSavedScore(game: any) {
  const sides = game.game_side ?? [];
  return sides.length >= 2 && sides.every((side: any) => side.game_side_result != null);
}

function gameScore(game: any, sideNumber: number): number | null {
  const side = game.game_side?.find((item: any) => item.side_number === sideNumber);
  const score = side?.game_side_result?.nieshs_scored;
  return score === undefined || score === null ? null : Number(score);
}

function gameOutcome(game: any): string {
  if (!hasSavedScore(game)) return "Résultat en attente";
  const side1 = gameScore(game, 1);
  const side2 = gameScore(game, 2);
  if (side1 === side2) return "Égalité";
  return side1! > side2!
    ? `Victoire de ${gameSideLabel(game, 1)}`
    : `Victoire de ${gameSideLabel(game, 2)}`;
}

const filteredGames = computed(() => {
  const query = gameSearch.value.trim().toLocaleLowerCase("fr-FR");

  return games.value.filter((game: any) => {
    const scored = hasSavedScore(game);
    if (gameFilter.value === "pending" && scored) return false;
    if (gameFilter.value === "finished" && !scored) return false;

    if (!query) return true;

    const searchable = [
      game.id,
      game.game_format?.label,
      gameSideLabel(game, 1),
      gameSideLabel(game, 2),
      new Date(game.date).toLocaleString("fr-FR"),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("fr-FR");

    return searchable.includes(query);
  });
});

const gamesWithoutScore = computed(
  () => games.value.filter((game: any) => !hasSavedScore(game)).length,
);
const gamesWithScore = computed(
  () => games.value.filter((game: any) => hasSavedScore(game)),
);

const availableSideOptions = computed(() => {
  const personItems = registeredParticipants.value.map((p: any) => ({
    value: `person:${p.person_id}`,
    label: `${p.persons.last_name} ${p.persons.first_name}`,
  }));

  const teamItems = teams.value.map((t: any) => ({
    value: `team:${t.id}`,
    label: `Équipe — ${t.name}`,
  }));

  return [...personItems, ...teamItems];
});

const selectedCompetition = computed(
  () =>
    competitions.value.find(
      (item) => item.id === selectedCompetitionId.value,
    ) ?? null,
);

const sections = [
  {
    id: "overview",
    label: "Vue d’ensemble",
    icon: "i-lucide-layout-dashboard",
  },
  { id: "participants", label: "Participants", icon: "i-lucide-users" },
  { id: "teams", label: "Équipes", icon: "i-lucide-shield" },
  { id: "games", label: "Matchs & scores", icon: "i-lucide-trophy" },
] as const;

async function refreshCompetitions() {
  competitions.value = await $fetch<Competition[]>("/api/competitions");

  if (
    selectedCompetitionId.value &&
    !competitions.value.some((c) => c.id === selectedCompetitionId.value)
  ) {
    selectedCompetitionId.value = null;
    detail.value = null;
  }
}

async function loadDetail(id: number | null) {
  if (!id) {
    detail.value = null;
    return;
  }

  detail.value = await $fetch(`/api/competitions/${id}`);

  for (const game of detail.value.games ?? []) {
    const side1 = game.game_side?.find((s: any) => s.side_number === 1);
    const side2 = game.game_side?.find((s: any) => s.side_number === 2);

    scoreDrafts[game.id] = {
      side1: side1?.game_side_result?.nieshs_scored ?? 0,
      side2: side2?.game_side_result?.nieshs_scored ?? 0,
    };
  }
}

async function selectCompetition() {
  pageError.value = "";
  pageSuccess.value = "";

  try {
    await loadDetail(selectedCompetitionId.value);
    participantSearch.value = "";
    gameSearch.value = "";
    gameFilter.value = "all";
    activeSection.value = "overview";
  } catch (error: any) {
    showError(error);
  }
}

function showError(error: any) {
  pageError.value =
    error?.data?.statusMessage ||
    error?.statusMessage ||
    error?.message ||
    "Une erreur est survenue.";

  pageSuccess.value = "";
}

function showSuccess(message: string) {
  pageSuccess.value = message;
  pageError.value = "";
}

async function runAction(
  action: () => Promise<unknown>,
  successMessage: string,
  refreshDetail = true,
) {
  busy.value = true;
  pageError.value = "";
  pageSuccess.value = "";

  try {
    await action();
    await refreshCompetitions();

    if (refreshDetail && selectedCompetitionId.value) {
      await loadDetail(selectedCompetitionId.value);
    }

    showSuccess(successMessage);
  } catch (error: any) {
    showError(error);
  } finally {
    busy.value = false;
  }
}

async function createCompetition() {
  await runAction(
    async () => {
      const created: any = await $fetch("/api/competitions", {
        method: "POST",
        body: {
          ...newCompetition,
          season_id: Number(newCompetition.season_id),
          location_id: Number(newCompetition.location_id),
          practice_site_id: Number(newCompetition.practice_site_id),
          format_id: Number(newCompetition.format_id),
          status: newCompetition.status ? Number(newCompetition.status) : null,
        },
      });

      selectedCompetitionId.value = created.id;
      await loadDetail(created.id);
      activeSection.value = "overview";

      Object.assign(newCompetition, {
        season_id: "",
        date: new Date().toISOString().slice(0, 10),
        location_id: "",
        practice_site_id: "",
        organizer_id: "",
        format_id: "",
        status: "",
      });
    },
    "Compétition créée.",
    false,
  );
}

async function addParticipant() {
  if (!selectedCompetitionId.value) return;

  await runAction(
    () =>
      $fetch(`/api/competitions/${selectedCompetitionId.value}/participants`, {
        method: "POST",
        body: {
          ...participantForm,
          status: Number(participantForm.status),
          category: Number(participantForm.category),
        },
      }),
    "Participant inscrit.",
  );

  Object.assign(participantForm, {
    person_id: "",
    license_id: "",
    status: "",
    category: "",
  });
}

async function createTeam() {
  if (!selectedCompetitionId.value) return;

  await runAction(
    () =>
      $fetch(`/api/competitions/${selectedCompetitionId.value}/teams`, {
        method: "POST",
        body: {
          name: teamForm.name,
          person_ids: teamForm.person_ids,
        },
      }),
    "Équipe créée.",
  );

  Object.assign(teamForm, { name: "", person_ids: [] });
}

function decodeSide(value: string) {
  const [type, ...idParts] = value.split(":");

  return {
    type,
    id: type === "person" ? idParts.join(":") : Number(idParts.join(":")),
  };
}

async function createGame() {
  if (!selectedCompetitionId.value) return;

  if (!gameForm.side1 || !gameForm.side2) {
    pageError.value = "Sélectionne les deux côtés du match.";
    return;
  }

  if (gameForm.side1 === gameForm.side2) {
    pageError.value = "Un match doit opposer deux côtés différents.";
    return;
  }

  await runAction(
    () =>
      $fetch(`/api/competitions/${selectedCompetitionId.value}/games`, {
        method: "POST",
        body: {
          date: gameForm.date,
          format_id: Number(gameForm.format_id),
          side1: decodeSide(gameForm.side1),
          side2: decodeSide(gameForm.side2),
        },
      }),
    "Match créé.",
  );

  Object.assign(gameForm, {
    date: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
    format_id: "",
    side1: "",
    side2: "",
  });
}

async function saveScore(gameId: number) {
  if (!selectedCompetitionId.value) return;

  const scores = scoreDrafts[gameId] ?? { side1: 0, side2: 0 };

  await runAction(
    () =>
      $fetch(`/api/games/${gameId}/result`, {
        method: "PUT",
        body: {
          side1_scored: Number(scores.side1),
          side2_scored: Number(scores.side2),
        },
      }),
    "Score enregistré.",
  );
}

function gameSideLabel(game: any, sideNumber: number) {
  const side = game.game_side?.find(
    (item: any) => item.side_number === sideNumber,
  );

  if (!side) return `Côté ${sideNumber}`;
  if (side.display_label) return side.display_label;

  if (side.game_participant?.length === 1) {
    const p = side.game_participant[0].persons;
    if (p) return `${p.first_name} ${p.last_name}`;
  }

  if (side.game_participant?.length > 1) {
    return side.game_participant
      .map((p: any) => `${p.persons.first_name} ${p.persons.last_name}`)
      .join(", ");
  }

  return `Côté ${sideNumber}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fullName(person: any) {
  return `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim();
}

function initials(person: any) {
  return `${person?.first_name?.[0] ?? ""}${person?.last_name?.[0] ?? ""}`.toUpperCase();
}

function statusLabel(status: any) {
  if (!status) return "Non défini";
  return status.label ?? status.code ?? String(status);
}

onMounted(async () => {
  try {
    await refreshCompetitions();
  } catch (error: any) {
    showError(error);
  }
});

watch(
  () => participantForm.person_id,
  () => {
    participantForm.license_id = "";
  },
);

watch(
  () => newCompetition.location_id,
  () => {
    const site = allOptions.value?.practiceSites.find(
      (s) => String(s.municipality_id) === String(newCompetition.location_id),
    );

    if (site) {
      newCompetition.practice_site_id = String(site.id);
    } else if (
      !allOptions.value?.practiceSites.some(
        (s) =>
          String(s.id) === newCompetition.practice_site_id &&
          String(s.municipality_id) === String(newCompetition.location_id),
      )
    ) {
      newCompetition.practice_site_id = "";
    }
  },
);
</script>

<template>
  <main
    class="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-10"
  >
    <div class="mx-auto max-w-7xl space-y-8">
      <!-- Header -->
      <header
        class="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"
      >
        <div>
          <p
            class="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400"
          >
            FF2B / Administration
          </p>
          <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">
            Compétitions
          </h1>
          <p
            class="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400"
          >
            Organise les compétitions, gère les inscriptions et suis les
            résultats.
          </p>
        </div>

        <button
          class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold shadow-sm transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
          :disabled="busy"
          @click="refreshCompetitions"
        >
          <UIcon name="i-lucide-refresh-cw" class="size-4" />
          Actualiser
        </button>
      </header>

      <!-- Alerts -->
      <div
        v-if="optionsError"
        class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
      >
        Impossible de charger les listes de référence. Vérifie les données de
        saisons, formats, statuts et licences.
      </div>

      <div
        v-if="pageError"
        role="alert"
        class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
      >
        {{ pageError }}
      </div>

      <div
        v-if="pageSuccess"
        role="status"
        class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
      >
        {{ pageSuccess }}
      </div>

      <!-- Global statistics -->
      <section class="grid gap-4 sm:grid-cols-3">
        <article
          class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400">
              Compétitions
            </p>
            <span
              class="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
            >
              <UIcon name="i-lucide-trophy" class="size-5" />
            </span>
          </div>
          <p class="mt-4 text-3xl font-bold">{{ competitions.length }}</p>
          <p class="mt-1 text-xs text-slate-400">Compétitions enregistrées</p>
        </article>

        <article
          class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400">
              Inscriptions
            </p>
            <span
              class="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
            >
              <UIcon name="i-lucide-users" class="size-5" />
            </span>
          </div>
          <p class="mt-4 text-3xl font-bold">
            {{
              competitions.reduce(
                (sum, c) => sum + (c._count?.competition_participant ?? 0),
                0,
              )
            }}
          </p>
          <p class="mt-1 text-xs text-slate-400">
            Participants inscrits au total
          </p>
        </article>

        <article
          class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400">
              Matchs
            </p>
            <span
              class="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
            >
              <UIcon name="i-lucide-calendar-check" class="size-5" />
            </span>
          </div>
          <p class="mt-4 text-3xl font-bold">
            {{
              competitions.reduce((sum, c) => sum + (c._count?.games ?? 0), 0)
            }}
          </p>
          <p class="mt-1 text-xs text-slate-400">Matchs toutes compétitions</p>
        </article>
      </section>

      <!-- Create and select -->
      <section class="grid items-start gap-6 xl:grid-cols-2">
        <!-- Create competition -->
        <div
          class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div
            class="border-b border-slate-100 p-5 dark:border-slate-800 sm:p-6"
          >
            <div class="flex items-center gap-3">
              <span
                class="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
              >
                <UIcon name="i-lucide-plus" class="size-5" />
              </span>
              <div>
                <h2 class="text-lg font-bold">Nouvelle compétition</h2>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Renseigne les informations principales.
                </p>
              </div>
            </div>
          </div>

          <form
            class="space-y-5 p-5 sm:p-6"
            @submit.prevent="createCompetition"
          >
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="grid gap-2 text-sm font-semibold">
                Saison
                <select
                  v-model="newCompetition.season_id"
                  required
                  class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="" disabled>Choisir une saison</option>
                  <option
                    v-for="s in options?.seasons ?? []"
                    :key="s.id"
                    :value="String(s.id)"
                  >
                    {{ s.start_year }}–{{ s.end_year }}
                  </option>
                </select>
              </label>

              <label class="grid gap-2 text-sm font-semibold">
                Date
                <input
                  v-model="newCompetition.date"
                  required
                  type="date"
                  class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              <label class="grid gap-2 text-sm font-semibold">
                Commune
                <select
                  v-model="newCompetition.location_id"
                  required
                  class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="" disabled>Choisir une commune</option>
                  <option
                    v-for="m in options?.municipalities ?? []"
                    :key="m.id"
                    :value="String(m.id)"
                  >
                    {{ m.name }} ({{ m.zip_code }})
                  </option>
                </select>
              </label>

              <label class="grid gap-2 text-sm font-semibold">
                Site de pratique
                <select
                  v-model="newCompetition.practice_site_id"
                  required
                  class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="" disabled>Choisir un site</option>
                  <option
                    v-for="s in (options?.practiceSites ?? []).filter(
                      (s) =>
                        !newCompetition.location_id ||
                        String(s.municipality_id) ===
                          String(newCompetition.location_id),
                    )"
                    :key="s.id"
                    :value="String(s.id)"
                  >
                    {{ s.name }}
                  </option>
                </select>
              </label>

              <label class="grid gap-2 text-sm font-semibold sm:col-span-2">
                Organisateur
                <select
                  v-model="newCompetition.organizer_id"
                  required
                  class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="" disabled>Choisir une personne</option>
                  <option
                    v-for="p in people"
                    :key="p.ff2b_id"
                    :value="p.ff2b_id"
                  >
                    {{ p.last_name }} {{ p.first_name }}
                  </option>
                </select>
              </label>

              <label class="grid gap-2 text-sm font-semibold sm:col-span-2">
                Format de compétition
                <select
                  v-model="newCompetition.format_id"
                  required
                  class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="" disabled>Choisir un format</option>
                  <option
                    v-for="f in options?.formats ?? []"
                    :key="f.id"
                    :value="String(f.id)"
                  >
                    {{ f.label }}
                  </option>
                </select>
              </label>

              <label class="grid gap-2 text-sm font-semibold sm:col-span-2">
                Statut
                <span class="font-normal text-slate-400">(facultatif)</span>
                <select
                  v-model="newCompetition.status"
                  class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="">Non défini</option>
                  <option
                    v-for="s in options?.statuses ?? []"
                    :key="s.id"
                    :value="String(s.id)"
                  >
                    {{ s.label }}
                  </option>
                </select>
              </label>
            </div>

            <button
              class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="busy"
            >
              <UIcon name="i-lucide-plus" class="size-4" />
              {{ busy ? "Enregistrement…" : "Créer la compétition" }}
            </button>
          </form>
        </div>

        <!-- Competition list -->
        <div
          class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div
            class="flex items-center justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800 sm:p-6"
          >
            <div>
              <h2 class="text-lg font-bold">Compétitions existantes</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Sélectionne une compétition pour la gérer.
              </p>
            </div>
            <span
              class="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold dark:bg-slate-800"
            >
              {{ competitions.length }}
            </span>
          </div>

          <div class="border-b border-slate-100 p-4 dark:border-slate-800 sm:px-6">
            <label class="relative block">
              <UIcon
                name="i-lucide-search"
                class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              />
              <input
                v-model="competitionSearch"
                type="search"
                placeholder="Rechercher par format, commune, saison ou n°…"
                class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-900"
                aria-label="Rechercher une compétition"
              />
            </label>
          </div>

          <div
            v-if="!competitions.length"
            class="flex flex-col items-center px-6 py-12 text-center"
          >
            <span
              class="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800"
            >
              <UIcon name="i-lucide-calendar-days" class="size-6" />
            </span>
            <p class="mt-4 font-semibold">Aucune compétition</p>
            <p class="mt-1 text-sm text-slate-500">
              Crée ta première compétition à gauche.
            </p>
          </div>

          <div v-else-if="!filteredCompetitions.length" class="px-6 py-10 text-center">
            <UIcon name="i-lucide-search-x" class="mx-auto size-6 text-slate-400" />
            <p class="mt-3 text-sm font-semibold">Aucun résultat</p>
            <p class="mt-1 text-xs text-slate-500">Essaie un autre terme de recherche.</p>
            <button class="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400" @click="competitionSearch = ''">
              Effacer la recherche
            </button>
          </div>

          <div v-else class="divide-y divide-slate-100 dark:divide-slate-800">
            <button
              v-for="c in filteredCompetitions"
              :key="c.id"
              class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60 sm:px-6"
              :class="{
                'bg-blue-50/70 dark:bg-blue-500/5':
                  selectedCompetitionId === c.id,
              }"
              @click="
                selectedCompetitionId = c.id;
                selectCompetition();
              "
            >
              <div class="flex min-w-0 items-center gap-3">
                <div
                  class="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  <span class="text-base">{{
                    new Date(c.date).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                    })
                  }}</span>
                  <span>{{
                    new Date(c.date)
                      .toLocaleDateString("fr-FR", { month: "short" })
                      .replace(".", "")
                  }}</span>
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold">
                    {{ c.competition_format?.label ?? "Compétition" }}
                  </p>
                  <p
                    class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400"
                  >
                    {{ c.municipalities?.name ?? "Lieu non précisé" }}
                    · Saison {{ c.seasons?.start_year ?? "—" }}–{{
                      c.seasons?.end_year ?? "—"
                    }}
                  </p>
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-3">
                <div class="hidden text-right sm:block">
                  <p class="text-xs font-semibold">
                    {{ c._count?.games ?? 0 }} matchs
                  </p>
                  <p class="mt-1 text-xs text-slate-500">
                    {{ c._count?.competition_participant ?? 0 }} inscrits
                  </p>
                </div>
                <UIcon
                  name="i-lucide-chevron-right"
                  class="size-4 text-slate-400"
                />
              </div>
            </button>
          </div>
        </div>
      </section>

      <!-- Competition management -->
      <section
        v-if="detail"
        class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <!-- Dark hero -->
        <div
          class="relative overflow-hidden bg-slate-950 px-5 py-7 text-white sm:px-8 sm:py-8"
        >
          <div
            class="pointer-events-none absolute -right-16 -top-28 size-72 rounded-full bg-blue-500/20 blur-3xl"
          ></div>
          <div
            class="pointer-events-none absolute -bottom-24 right-1/3 size-48 rounded-full bg-violet-500/20 blur-3xl"
          ></div>

          <div
            class="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end"
          >
            <div>
              <div class="mb-3 flex flex-wrap items-center gap-2">
                <span
                  class="rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold text-blue-200"
                >
                  COMPÉTITION #{{ detail.id }}
                </span>
                <span
                  class="rounded-md bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-300"
                >
                  {{ detail.competition_status?.label ?? "Statut non défini" }}
                </span>
              </div>
              <h2 class="text-2xl font-bold tracking-tight sm:text-3xl">
                {{ detail.competition_format?.label ?? "Compétition" }}
              </h2>
              <div
                class="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300"
              >
                <span class="inline-flex items-center gap-2"
                  ><UIcon
                    name="i-lucide-map-pin"
                    class="size-4 text-blue-300"
                  />{{
                    detail.municipalities?.name ?? "Lieu non précisé"
                  }}</span
                >
                <span class="inline-flex items-center gap-2"
                  ><UIcon
                    name="i-lucide-calendar"
                    class="size-4 text-blue-300"
                  />{{ formatDate(detail.date) }}</span
                >
                <span class="inline-flex items-center gap-2"
                  ><UIcon name="i-lucide-map" class="size-4 text-blue-300" />{{
                    detail.practice_site?.name ?? "Site non précisé"
                  }}</span
                >
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3 sm:min-w-72">
              <div
                class="rounded-xl border border-white/10 bg-white/[0.06] p-3"
              >
                <p class="text-xs text-slate-400">Inscrits</p>
                <p class="mt-1 text-2xl font-bold">
                  {{ registeredParticipants.length }}
                </p>
              </div>
              <div
                class="rounded-xl border border-white/10 bg-white/[0.06] p-3"
              >
                <p class="text-xs text-slate-400">Équipes</p>
                <p class="mt-1 text-2xl font-bold">{{ teams.length }}</p>
              </div>
              <div
                class="rounded-xl border border-white/10 bg-white/[0.06] p-3"
              >
                <p class="text-xs text-slate-400">Matchs</p>
                <p class="mt-1 text-2xl font-bold">{{ games.length }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <nav
          class="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 pt-3 dark:border-slate-800 sm:px-6"
        >
          <button
            v-for="section in [
              {
                id: 'overview',
                label: 'Vue d’ensemble',
                icon: 'i-lucide-layout-dashboard',
              },
              {
                id: 'participants',
                label: 'Participants',
                icon: 'i-lucide-users',
              },
              { id: 'teams', label: 'Équipes', icon: 'i-lucide-shield' },
              {
                id: 'games',
                label: 'Matchs & scores',
                icon: 'i-lucide-trophy',
              },
            ]"
            :key="section.id"
            class="inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-semibold transition sm:px-4"
            :class="
              activeSection === section.id
                ? 'border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            "
            @click="activeSection = section.id as any"
          >
            <UIcon :name="section.icon" class="size-4" />
            {{ section.label }}
          </button>
        </nav>

        <div class="p-5 sm:p-7">
          <!-- Overview -->
          <div v-if="activeSection === 'overview'" class="space-y-6">
            <div>
              <h3 class="text-lg font-bold">Vue d’ensemble</h3>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Un aperçu de l’activité de cette compétition.
              </p>
            </div>

            <div class="grid gap-4 md:grid-cols-3">
              <button
                class="group rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-blue-900"
                @click="activeSection = 'participants'"
              >
                <span
                  class="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                  ><UIcon name="i-lucide-users" class="size-5"
                /></span>
                <span class="mt-4 block text-2xl font-bold">{{
                  registeredParticipants.length
                }}</span>
                <span class="mt-1 block text-sm font-semibold"
                  >Participants inscrits</span
                >
                <span class="mt-2 block text-xs text-slate-500"
                  >Consulter les inscriptions</span
                >
                <span
                  class="mt-5 inline-flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:gap-2 dark:text-blue-400"
                  >Gérer les participants
                  <UIcon name="i-lucide-arrow-right" class="size-3.5"
                /></span>
              </button>

              <button
                class="group rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-violet-900"
                @click="activeSection = 'teams'"
              >
                <span
                  class="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
                  ><UIcon name="i-lucide-shield" class="size-5"
                /></span>
                <span class="mt-4 block text-2xl font-bold">{{
                  teams.length
                }}</span>
                <span class="mt-1 block text-sm font-semibold"
                  >Équipes constituées</span
                >
                <span class="mt-2 block text-xs text-slate-500"
                  >Composition et membres</span
                >
                <span
                  class="mt-5 inline-flex items-center gap-1 text-xs font-bold text-violet-600 group-hover:gap-2 dark:text-violet-400"
                  >Gérer les équipes
                  <UIcon name="i-lucide-arrow-right" class="size-3.5"
                /></span>
              </button>

              <button
                class="group rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-emerald-900"
                @click="activeSection = 'games'"
              >
                <span
                  class="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                  ><UIcon name="i-lucide-trophy" class="size-5"
                /></span>
                <span class="mt-4 block text-2xl font-bold">{{
                  games.length
                }}</span>
                <span class="mt-1 block text-sm font-semibold"
                  >Matchs enregistrés</span
                >
                <span class="mt-2 block text-xs text-slate-500"
                  >Programmation et résultats</span
                >
                <span
                  class="mt-5 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:gap-2 dark:text-emerald-400"
                  >Gérer les matchs
                  <UIcon name="i-lucide-arrow-right" class="size-3.5"
                /></span>
              </button>
            </div>
          </div>

          <!-- Participants -->
          <div
            v-else-if="activeSection === 'participants'"
            class="grid items-start gap-7 xl:grid-cols-[320px_minmax(0,1fr)]"
          >
            <form
              class="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/40 sm:p-6"
              @submit.prevent="addParticipant"
            >
              <span
                class="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                ><UIcon name="i-lucide-user-plus" class="size-5"
              /></span>
              <h3 class="mt-4 text-base font-bold">Inscrire une personne</h3>
              <p class="mt-1 mb-5 text-sm text-slate-500">
                Ajoute un licencié à la compétition.
              </p>

              <div class="space-y-4">
                <label class="grid gap-2 text-sm font-semibold">
                  Personne
                  <select
                    v-model="participantForm.person_id"
                    required
                    class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="" disabled>Choisir une personne</option>
                    <option
                      v-for="p in people"
                      :key="p.ff2b_id"
                      :value="p.ff2b_id"
                    >
                      {{ p.last_name }} {{ p.first_name }}
                    </option>
                  </select>
                </label>

                <label class="grid gap-2 text-sm font-semibold">
                  Licence de la saison
                  <select
                    v-model="participantForm.license_id"
                    required
                    class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="" disabled>Choisir une licence</option>
                    <option
                      v-for="l in availableLicenses"
                      :key="l.id"
                      :value="l.id"
                    >
                      {{ l.license_status }} · {{ l.seasons?.start_year }}–{{
                        l.seasons?.end_year
                      }}
                    </option>
                  </select>
                  <span
                    v-if="
                      participantForm.person_id && !availableLicenses.length
                    "
                    class="text-xs font-medium text-amber-600"
                    >Aucune licence trouvée pour cette saison.</span
                  >
                </label>

                <label class="grid gap-2 text-sm font-semibold">
                  Statut
                  <select
                    v-model="participantForm.status"
                    required
                    class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="" disabled>Choisir un statut</option>
                    <option
                      v-for="s in options?.participantStatuses ?? []"
                      :key="s.id"
                      :value="String(s.id)"
                    >
                      {{ s.label }}
                    </option>
                  </select>
                </label>

                <label class="grid gap-2 text-sm font-semibold">
                  Catégorie
                  <select
                    v-model="participantForm.category"
                    required
                    class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="" disabled>Choisir une catégorie</option>
                    <option
                      v-for="c in options?.participantCategories ?? []"
                      :key="c.id"
                      :value="String(c.id)"
                    >
                      {{ c.label }}
                    </option>
                  </select>
                </label>
              </div>

              <button
                class="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                :disabled="busy || !availableLicenses.length"
              >
                <UIcon name="i-lucide-user-plus" class="size-4" /> Inscrire le
                participant
              </button>
            </form>

            <div class="min-w-0">
              <div class="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-lg font-bold">Participants</h3>
                  <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Personnes enregistrées dans cette compétition.
                  </p>
                </div>
                <span
                  class="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold dark:bg-slate-800"
                  >{{ registeredParticipants.length }}</span
                >
              </div>

              <label class="relative mb-4 block">
                <UIcon name="i-lucide-search" class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  v-model="participantSearch"
                  type="search"
                  placeholder="Rechercher un participant, un e-mail, un statut…"
                  aria-label="Rechercher un participant"
                  class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              <div
                v-if="!registeredParticipants.length"
                class="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center dark:border-slate-700"
              >
                <UIcon
                  name="i-lucide-users"
                  class="mx-auto size-7 text-slate-400"
                />
                <p class="mt-3 font-semibold">Aucun participant inscrit</p>
                <p class="mt-1 text-sm text-slate-500">
                  Utilise le formulaire pour ajouter la première personne.
                </p>
              </div>

              <div
                v-else-if="!filteredParticipants.length"
                class="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-700"
              >
                Aucun participant ne correspond à cette recherche.
                <button class="ml-1 font-semibold text-blue-600 dark:text-blue-400" @click="participantSearch = ''">Effacer</button>
              </div>

              <div
                v-else
                class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"
              >
                <table class="w-full min-w-[600px] text-left text-sm">
                  <thead
                    class="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60"
                  >
                    <tr>
                      <th class="px-4 py-3">Participant</th>
                      <th class="px-4 py-3">Licence</th>
                      <th class="px-4 py-3">Statut</th>
                      <th class="px-4 py-3">Catégorie</th>
                    </tr>
                  </thead>
                  <tbody
                    class="divide-y divide-slate-100 dark:divide-slate-800"
                  >
                    <tr
                      v-for="p in filteredParticipants"
                      :key="p.id"
                      class="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td class="px-4 py-3">
                        <span class="font-semibold"
                          >{{ p.persons.last_name }}
                          {{ p.persons.first_name }}</span
                        >
                        <span class="mt-0.5 block text-xs text-slate-500">{{
                          p.persons.email ?? "Aucun e-mail"
                        }}</span>
                      </td>
                      <td class="px-4 py-3">
                        {{
                          p.licenses
                            ?.license_type_licenses_license_typeTolicense_type
                            ?.license_label ?? "—"
                        }}
                      </td>
                      <td class="px-4 py-3">
                        <span
                          class="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold dark:bg-slate-800"
                          >{{
                            p.competition_participant_status?.label ?? "—"
                          }}</span
                        >
                      </td>
                      <td class="px-4 py-3">
                        {{ p.competition_participant_category?.label ?? "—" }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Teams -->
          <div
            v-else-if="activeSection === 'teams'"
            class="grid items-start gap-7 xl:grid-cols-[320px_minmax(0,1fr)]"
          >
            <form
              class="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/40 sm:p-6"
              @submit.prevent="createTeam"
            >
              <span
                class="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
                ><UIcon name="i-lucide-shield-plus" class="size-5"
              /></span>
              <h3 class="mt-4 text-base font-bold">Créer une équipe</h3>
              <p class="mt-1 mb-5 text-sm text-slate-500">
                Choisis un nom et ses membres.
              </p>

              <label class="grid gap-2 text-sm font-semibold">
                Nom de l’équipe
                <input
                  v-model.trim="teamForm.name"
                  required
                  minlength="2"
                  maxlength="120"
                  class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950"
                  placeholder="Ex. Les Nieshs nantais"
                />
              </label>

              <div class="mt-5">
                <div class="mb-2 flex items-center justify-between">
                  <p class="text-sm font-semibold">Membres inscrits</p>
                  <span class="text-xs text-slate-500"
                    >{{ teamForm.person_ids.length }} sélectionné(s)</span
                  >
                </div>
                <div
                  v-if="!registeredParticipants.length"
                  class="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
                >
                  Inscris d’abord des participants.
                </div>
                <div
                  v-else
                  class="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-700"
                >
                  <label
                    v-for="p in registeredParticipants"
                    :key="p.person_id"
                    class="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <input
                      v-model="teamForm.person_ids"
                      type="checkbox"
                      :value="p.person_id"
                      class="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span
                      class="flex size-8 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                      >{{ p.persons.first_name?.[0]
                      }}{{ p.persons.last_name?.[0] }}</span
                    >
                    <span class="font-medium"
                      >{{ p.persons.last_name }}
                      {{ p.persons.first_name }}</span
                    >
                  </label>
                </div>
              </div>

              <button
                class="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                :disabled="
                  busy ||
                  !registeredParticipants.length ||
                  !teamForm.person_ids.length
                "
              >
                <UIcon name="i-lucide-plus" class="size-4" /> Créer l’équipe
              </button>
            </form>

            <div>
              <div class="mb-4">
                <h3 class="text-lg font-bold">Équipes constituées</h3>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Composition des équipes de la compétition.
                </p>
              </div>

              <div
                v-if="!teams.length"
                class="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center dark:border-slate-700"
              >
                <UIcon
                  name="i-lucide-shield"
                  class="mx-auto size-7 text-slate-400"
                />
                <p class="mt-3 font-semibold">Aucune équipe créée</p>
                <p class="mt-1 text-sm text-slate-500">
                  Les équipes créées apparaîtront ici.
                </p>
              </div>

              <div v-else class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                <article
                  v-for="t in teams"
                  :key="t.id"
                  class="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-slate-700"
                >
                  <div class="flex items-start justify-between gap-3">
                    <span
                      class="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
                      ><UIcon name="i-lucide-shield" class="size-5"
                    /></span>
                    <span
                      class="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      >{{ t.team_members.length }} membre(s)</span
                    >
                  </div>
                  <h4 class="mt-4 text-base font-bold">{{ t.name }}</h4>
                  <div class="my-4 h-px bg-slate-100 dark:bg-slate-800"></div>
                  <ul class="space-y-3">
                    <li
                      v-for="m in t.team_members"
                      :key="m.person_id"
                      class="flex items-center gap-2.5 text-sm"
                    >
                      <span
                        class="flex size-8 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                        >{{ m.persons.first_name?.[0]
                        }}{{ m.persons.last_name?.[0] }}</span
                      >
                      <span class="font-medium"
                        >{{ m.persons.first_name }}
                        {{ m.persons.last_name }}</span
                      >
                    </li>
                  </ul>
                </article>
              </div>
            </div>
          </div>

          <!-- Games -->
          <div
            v-else
            class="grid items-start gap-7 xl:grid-cols-[320px_minmax(0,1fr)]"
          >
            <form
              class="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/40 sm:p-6"
              @submit.prevent="createGame"
            >
              <span
                class="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                ><UIcon name="i-lucide-trophy" class="size-5"
              /></span>
              <h3 class="mt-4 text-base font-bold">Programmer un match</h3>
              <p class="mt-1 mb-5 text-sm text-slate-500">
                Définis les adversaires et le format.
              </p>

              <div class="space-y-4">
                <label class="grid gap-2 text-sm font-semibold">
                  Date et heure
                  <input
                    v-model="gameForm.date"
                    required
                    type="datetime-local"
                    class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>

                <label class="grid gap-2 text-sm font-semibold">
                  Format du match
                  <select
                    v-model="gameForm.format_id"
                    required
                    class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="" disabled>Choisir un format</option>
                    <option
                      v-for="f in options?.gameFormats ?? []"
                      :key="f.id"
                      :value="String(f.id)"
                    >
                      {{ f.label }}
                    </option>
                  </select>
                </label>

                <div
                  class="rounded-xl border border-slate-200 p-3 dark:border-slate-700"
                >
                  <label class="grid gap-2 text-sm font-semibold">
                    Côté 1
                    <select
                      v-model="gameForm.side1"
                      required
                      class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950"
                    >
                      <option value="" disabled>Choisir un adversaire</option>
                      <option
                        v-for="item in availableSideOptions"
                        :key="item.value"
                        :value="item.value"
                      >
                        {{ item.label }}
                      </option>
                    </select>
                  </label>

                  <div class="my-3 flex items-center gap-3">
                    <div
                      class="h-px flex-1 bg-slate-200 dark:bg-slate-700"
                    ></div>
                    <span
                      class="text-xs font-bold uppercase tracking-widest text-slate-400"
                      >VS</span
                    >
                    <div
                      class="h-px flex-1 bg-slate-200 dark:bg-slate-700"
                    ></div>
                  </div>

                  <label class="grid gap-2 text-sm font-semibold">
                    Côté 2
                    <select
                      v-model="gameForm.side2"
                      required
                      class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950"
                    >
                      <option value="" disabled>Choisir un adversaire</option>
                      <option
                        v-for="item in availableSideOptions"
                        :key="item.value"
                        :value="item.value"
                        :disabled="item.value === gameForm.side1"
                      >
                        {{ item.label }}
                      </option>
                    </select>
                  </label>
                </div>
              </div>

              <p
                v-if="!registeredParticipants.length"
                class="mt-3 text-xs text-amber-600"
              >
                Inscris des participants avant de créer des matchs.
              </p>
              <button
                class="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                :disabled="
                  busy ||
                  !registeredParticipants.length ||
                  availableSideOptions.length < 2
                "
              >
                <UIcon name="i-lucide-calendar-plus" class="size-4" /> Créer le
                match
              </button>
            </form>

            <div class="min-w-0">
              <div class="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-lg font-bold">Matchs & résultats</h3>
                  <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Consulte les rencontres et enregistre les scores.
                  </p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold dark:bg-slate-800">{{ games.length }} match(s)</span>
                </div>
              </div>

              <div class="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/30">
                  <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Matchs programmés</p>
                  <p class="mt-2 text-2xl font-bold tabular-nums">{{ games.length }}</p>
                  <p class="mt-1 text-xs text-slate-500">Toutes les rencontres</p>
                </div>
                <div class="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                  <p class="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Matchs terminés</p>
                  <p class="mt-2 text-2xl font-bold tabular-nums text-emerald-800 dark:text-emerald-200">{{ gamesWithScore.length }}</p>
                  <p class="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">Avec un score enregistré</p>
                </div>
                <div class="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
                  <p class="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Résultats à saisir</p>
                  <p class="mt-2 text-2xl font-bold tabular-nums text-amber-800 dark:text-amber-200">{{ gamesWithoutScore }}</p>
                  <p class="mt-1 text-xs text-amber-700/80 dark:text-amber-300/80">Matchs sans score complet</p>
                </div>
              </div>

              <div v-if="gamesWithScore.length" class="mb-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/30 sm:p-5">
                <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 class="font-bold">Tableau des scores</h4>
                    <p class="mt-1 text-sm text-slate-500">Résultats des {{ gamesWithScore.length }} rencontre(s) terminée(s).</p>
                  </div>
                  <button class="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400" @click="gameFilter = 'finished'">Voir tous les résultats</button>
                </div>
                <div class="overflow-x-auto">
                  <table class="w-full min-w-[440px] text-left text-sm">
                    <thead>
                      <tr class="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700">
                        <th class="px-3 py-3 font-semibold">Rencontre</th>
                        <th class="px-3 py-3 text-right font-semibold">Score</th>
                        <th class="px-3 py-3 text-right font-semibold">Résultat</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="g in gamesWithScore" :key="`score-${g.id}`" class="border-b border-slate-100 last:border-0 dark:border-slate-800">
                        <td class="px-3 py-3">
                          <p class="font-semibold">{{ gameSideLabel(g, 1) }} <span class="font-normal text-slate-400">vs</span> {{ gameSideLabel(g, 2) }}</p>
                          <p class="mt-1 text-xs text-slate-500">Match #{{ g.id }} · {{ new Date(g.date).toLocaleDateString('fr-FR') }}</p>
                        </td>
                        <td class="px-3 py-3 text-right font-bold tabular-nums">
                          <span :class="gameScore(g, 1)! > gameScore(g, 2)! ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'">{{ gameScore(g, 1) }}</span>
                          <span class="px-1 text-slate-400">–</span>
                          <span :class="gameScore(g, 2)! > gameScore(g, 1)! ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'">{{ gameScore(g, 2) }}</span>
                        </td>
                        <td class="px-3 py-3 text-right text-xs font-semibold" :class="gameScore(g, 1) === gameScore(g, 2) ? 'text-slate-500' : 'text-emerald-700 dark:text-emerald-300'">{{ gameOutcome(g) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
                <label class="relative block">
                  <UIcon name="i-lucide-search" class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    v-model="gameSearch"
                    type="search"
                    placeholder="Rechercher un joueur, une équipe ou un n° de match…"
                    aria-label="Rechercher un match"
                    class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
                <select v-model="gameFilter" aria-label="Filtrer les matchs" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950">
                  <option value="all">Tous les matchs</option>
                  <option value="pending">À jouer / score à saisir</option>
                  <option value="finished">Matchs terminés</option>
                </select>
              </div>

              <div
                v-if="!games.length"
                class="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center dark:border-slate-700"
              >
                <UIcon
                  name="i-lucide-trophy"
                  class="mx-auto size-7 text-slate-400"
                />
                <p class="mt-3 font-semibold">Aucun match programmé</p>
                <p class="mt-1 text-sm text-slate-500">
                  Crée une rencontre à l’aide du formulaire.
                </p>
              </div>

              <div v-else-if="!filteredGames.length" class="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center dark:border-slate-700">
                <UIcon name="i-lucide-search-x" class="mx-auto size-6 text-slate-400" />
                <p class="mt-3 text-sm font-semibold">Aucun match trouvé</p>
                <p class="mt-1 text-xs text-slate-500">Modifie les filtres ou efface la recherche.</p>
                <button class="mt-3 text-sm font-semibold text-blue-600 dark:text-blue-400" @click="gameSearch = ''; gameFilter = 'all'">Réinitialiser les filtres</button>
              </div>

              <div v-else class="space-y-4">
                <article
                  v-for="g in filteredGames"
                  :key="g.id"
                  class="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/30 dark:hover:border-slate-700 sm:p-5"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div class="flex flex-wrap items-center gap-2">
                        <span
                          class="text-xs font-bold uppercase tracking-wider text-slate-400"
                          >Match #{{ g.id }}</span
                        >
                        <span
                          class="rounded-md px-2 py-1 text-xs font-semibold"
                          :class="hasSavedScore(g) ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'"
                          >{{ hasSavedScore(g) ? "Score enregistré" : "Score à saisir" }}</span
                        >
                      </div>
                      <p
                        class="mt-2 text-sm text-slate-500 dark:text-slate-400"
                      >
                        {{ g.game_format?.label ?? "Format non précisé" }} ·
                        {{ new Date(g.date).toLocaleString("fr-FR") }}
                      </p>
                    </div>
                  </div>

                  <div v-if="hasSavedScore(g)" class="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50 sm:p-5">
                    <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                      <div class="min-w-0 text-center">
                        <p class="truncate text-sm font-semibold">{{ gameSideLabel(g, 1) }}</p>
                        <p class="mt-2 text-3xl font-black tabular-nums" :class="gameScore(g, 1)! > gameScore(g, 2)! ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'">{{ gameScore(g, 1) }}</p>
                      </div>
                      <span class="text-xs font-bold uppercase tracking-widest text-slate-400">–</span>
                      <div class="min-w-0 text-center">
                        <p class="truncate text-sm font-semibold">{{ gameSideLabel(g, 2) }}</p>
                        <p class="mt-2 text-3xl font-black tabular-nums" :class="gameScore(g, 2)! > gameScore(g, 1)! ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'">{{ gameScore(g, 2) }}</p>
                      </div>
                    </div>
                    <div class="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                      <p class="text-sm font-semibold" :class="gameScore(g, 1) === gameScore(g, 2) ? 'text-slate-500' : 'text-emerald-700 dark:text-emerald-300'">{{ gameOutcome(g) }}</p>
                      <button type="button" class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800" @click="editingGameId = editingGameId === g.id ? null : g.id">
                        <UIcon :name="editingGameId === g.id ? 'i-lucide-x' : 'i-lucide-pencil'" class="size-3.5" />
                        {{ editingGameId === g.id ? 'Annuler la modification' : 'Modifier le score' }}
                      </button>
                    </div>
                  </div>

                  <div v-else class="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                    <div class="min-w-0 rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/70 sm:p-4">
                      <p class="truncate text-sm font-semibold">{{ gameSideLabel(g, 1) }}</p>
                      <p class="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Côté 1</p>
                    </div>
                    <span class="text-xs font-bold uppercase tracking-widest text-slate-400">VS</span>
                    <div class="min-w-0 rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/70 sm:p-4">
                      <p class="truncate text-sm font-semibold">{{ gameSideLabel(g, 2) }}</p>
                      <p class="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Côté 2</p>
                    </div>
                  </div>

                  <form
                    v-if="!hasSavedScore(g) || editingGameId === g.id"
                    class="mt-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                    @submit.prevent="saveScore(g.id)"
                  >
                    <div class="mb-3 flex items-center justify-between gap-2">
                      <p class="text-sm font-semibold">Score de la rencontre</p>
                      <span class="text-xs text-slate-500">Nieshs marqués</span>
                    </div>
                    <div class="flex flex-wrap items-end gap-3">
                      <label
                        class="grid min-w-0 flex-1 gap-2 text-sm font-semibold"
                      >
                        {{ gameSideLabel(g, 1) }}
                        <input
                          v-model.number="scoreDrafts[g.id].side1"
                          type="number"
                          min="0"
                          step="1"
                          required
                          class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center text-lg font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900"
                        />
                      </label>
                      <span class="pb-3 text-lg font-bold text-slate-300"
                        >:</span
                      >
                      <label
                        class="grid min-w-0 flex-1 gap-2 text-sm font-semibold"
                      >
                        {{ gameSideLabel(g, 2) }}
                        <input
                          v-model.number="scoreDrafts[g.id].side2"
                          type="number"
                          min="0"
                          step="1"
                          required
                          class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center text-lg font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900"
                        />
                      </label>
                      <button
                        class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 sm:w-auto"
                        :disabled="busy"
                      >
                        <UIcon name="i-lucide-save" class="size-4" />
                        {{ busy ? "Enregistrement…" : hasSavedScore(g) ? "Mettre à jour le score" : "Enregistrer le score" }}
                      </button>
                    </div>
                  </form>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Empty selection -->
      <section
        v-else
        class="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40"
      >
        <span
          class="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800"
        >
          <UIcon name="i-lucide-mouse-pointer-click" class="size-6" />
        </span>
        <h2 class="mt-4 font-bold">Sélectionne une compétition</h2>
        <p
          class="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400"
        >
          Choisis une compétition ci-dessus pour accéder aux participants,
          équipes, matchs et résultats.
        </p>
      </section>

      <footer
        class="flex flex-col justify-between gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 dark:border-slate-800 sm:flex-row"
      >
        <span>FF2B · Gestion des compétitions</span>
        <span>Administration des participants et des résultats</span>
      </footer>
    </div>
  </main>
</template>
