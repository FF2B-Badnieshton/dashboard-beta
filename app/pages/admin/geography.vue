<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: ["admin-auth"],
});

type GeoType = "country" | "region" | "department" | "municipality";

type GeoItem = {
  type: GeoType;
  name: string;
  code: string;
  insee_code?: string;
  zip_codes?: string[];
  department_code?: string;
  region_code?: string;
  country_code?: string;
};

type SavedItem = {
  id: number;
  name: string;
  code?: string | null;
  insee_code?: string | null;
  zip_code?: string | null;
};

const toast = useToast();

const tabs = [
  { label: "Pays", value: "country" },
  { label: "Régions", value: "region" },
  { label: "Départements", value: "department" },
  { label: "Communes", value: "municipality" },
];

const activeType = ref<GeoType>("municipality");
const query = ref("");
const countryName = ref("");
const countryCode = ref("");
const results = ref<GeoItem[]>([]);
const selected = ref<GeoItem | null>(null);
const saved = ref<SavedItem[]>([]);
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref("");

const searchPlaceholder = computed(() => {
  switch (activeType.value) {
    case "region":
      return "Rechercher une région...";
    case "department":
      return "Rechercher un département (ex. Loire-Atlantique)...";
    case "municipality":
      return "Commune, code postal ou code INSEE...";
    default:
      return "Les pays sont ajoutés manuellement.";
  }
});

const search = async () => {
  if (activeType.value === "country") {
    results.value = [];
    return;
  }

  if (!query.value.trim()) {
    results.value = [];
    return;
  }

  loading.value = true;
  errorMessage.value = "";
  selected.value = null;

  try {
    const response = await $fetch<{ results: GeoItem[] }>(
      "/api/geography/search",
      { query: { type: activeType.value, q: query.value.trim() } },
    );
    results.value = response.results;
  } catch (error: any) {
    errorMessage.value =
      error?.data?.statusMessage ?? "Impossible de rechercher les données.";
  } finally {
    loading.value = false;
  }
};

const loadSaved = async () => {
  try {
    const response = await $fetch<{ items: SavedItem[] }>("/api/geography", {
      query: { type: activeType.value },
    });
    saved.value = response.items;
  } catch (error: any) {
    errorMessage.value =
      error?.data?.statusMessage ??
      "Impossible de charger les données locales.";
  }
};

const choose = (item: GeoItem) => {
  selected.value = item;
};

const saveSelected = async () => {
  if (!selected.value) return;

  saving.value = true;
  errorMessage.value = "";

  try {
    const response = await $fetch<{ message: string }>("/api/geography", {
      method: "POST",
      body: selected.value,
    });

    toast.add({ title: response.message, color: "success" });
    selected.value = null;
    await loadSaved();
  } catch (error: any) {
    errorMessage.value =
      error?.data?.statusMessage ?? "Impossible d'enregistrer cet élément.";
  } finally {
    saving.value = false;
  }
};

const saveCountry = async () => {
  if (!countryName.value.trim() || !countryCode.value.trim()) {
    errorMessage.value = "Le nom et le code du pays sont obligatoires.";
    return;
  }

  saving.value = true;
  errorMessage.value = "";

  try {
    const response = await $fetch<{ message: string }>("/api/geography", {
      method: "POST",
      body: {
        type: "country",
        name: countryName.value.trim(),
        code: countryCode.value.trim().toUpperCase(),
      },
    });

    toast.add({ title: response.message, color: "success" });
    countryName.value = "";
    countryCode.value = "";
    await loadSaved();
  } catch (error: any) {
    errorMessage.value =
      error?.data?.statusMessage ?? "Impossible d'enregistrer ce pays.";
  } finally {
    saving.value = false;
  }
};

watch(activeType, async () => {
  query.value = "";
  results.value = [];
  selected.value = null;
  errorMessage.value = "";
  await loadSaved();
});

await loadSaved();
</script>

<template>
  <div class="space-y-6">
    <UPageHeader
      title="Référentiel géographique"
      description="Gérez les pays, régions, départements et communes de la FF2B."
    />

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      :title="errorMessage"
      :close-button="{ onClick: () => (errorMessage = '') }"
    />

    <UCard>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="tab in tabs"
          :key="tab.value"
          :variant="activeType === tab.value ? 'solid' : 'soft'"
          :color="activeType === tab.value ? 'primary' : 'neutral'"
          @click="activeType = tab.value as GeoType"
        >
          {{ tab.label }}
        </UButton>
      </div>
    </UCard>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <UCard>
        <template #header>
          <div>
            <h2 class="font-semibold">
              {{
                activeType === "country"
                  ? "Ajouter un pays"
                  : "Recherche officielle"
              }}
            </h2>
            <p class="mt-1 text-sm text-muted">
              {{
                activeType === "country"
                  ? "Les pays sont saisis manuellement."
                  : "Recherche dans le découpage administratif français."
              }}
            </p>
          </div>
        </template>

        <form
          v-if="activeType === 'country'"
          class="space-y-4"
          @submit.prevent="saveCountry"
        >
          <UFormField label="Nom du pays" required>
            <UInput v-model="countryName" placeholder="France" class="w-full" />
          </UFormField>

          <UFormField label="Code du pays" required>
            <UInput
              v-model="countryCode"
              placeholder="FR"
              maxlength="3"
              class="w-full"
            />
          </UFormField>

          <UButton type="submit" :loading="saving" icon="i-lucide-plus">
            Ajouter le pays
          </UButton>
        </form>

        <div v-else class="space-y-4">
          <form class="flex gap-2" @submit.prevent="search">
            <UInput
              v-model="query"
              :placeholder="searchPlaceholder"
              icon="i-lucide-search"
              class="min-w-0 flex-1"
            />
            <UButton type="submit" :loading="loading"> Rechercher </UButton>
          </form>

          <p class="text-sm text-muted">{{ results.length }} résultat(s)</p>

          <div
            v-if="results.length"
            class="max-h-[480px] space-y-2 overflow-y-auto"
          >
            <button
              v-for="item in results"
              :key="`${item.type}-${item.code}`"
              type="button"
              class="w-full rounded-lg border p-3 text-left transition-colors hover:bg-elevated"
              :class="
                selected?.code === item.code
                  ? 'border-primary bg-primary/5'
                  : 'border-default'
              "
              @click="choose(item)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-medium">{{ item.name }}</p>
                  <p class="mt-1 text-xs text-muted">
                    Code : {{ item.insee_code || item.code }}
                    <span v-if="item.zip_codes?.length">
                      · {{ item.zip_codes.join(", ") }}
                    </span>
                  </p>
                  <p
                    v-if="item.department_code"
                    class="mt-1 text-xs text-muted"
                  >
                    Département : {{ item.department_code }}
                  </p>
                  <p v-if="item.region_code" class="text-xs text-muted">
                    Région : {{ item.region_code }}
                  </p>
                </div>
                <UIcon
                  :name="
                    selected?.code === item.code
                      ? 'i-lucide-circle-check'
                      : 'i-lucide-circle'
                  "
                  class="mt-1 size-5 shrink-0"
                />
              </div>
            </button>
          </div>

          <UAlert
            v-else-if="!loading && query.trim()"
            color="neutral"
            variant="subtle"
            title="Aucun résultat"
            description="Vérifiez la recherche ou essayez avec un code officiel."
          />

          <div v-if="selected" class="rounded-lg border border-primary/40 p-4">
            <p class="font-semibold">{{ selected.name }}</p>
            <p class="mt-1 text-sm text-muted">
              Code officiel : {{ selected.insee_code || selected.code }}
            </p>
            <UButton
              class="mt-4"
              icon="i-lucide-database"
              :loading="saving"
              @click="saveSelected"
            >
              Ajouter à la base FF2B
            </UButton>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div>
            <h2 class="font-semibold">Base locale FF2B</h2>
            <p class="text-sm text-muted">
              {{ saved.length }} enregistrement(s) affiché(s)
            </p>
          </div>
        </template>

        <div
          v-if="saved.length"
          class="max-h-[600px] space-y-3 overflow-y-auto"
        >
          <div
            v-for="item in saved"
            :key="item.id"
            class="flex items-start justify-between gap-3 border-b border-default pb-3 last:border-0"
          >
            <div class="min-w-0">
              <p class="font-medium">{{ item.name }}</p>
              <p class="text-xs text-muted">
                {{ item.insee_code || item.code || "Sans code" }}
                <span v-if="item.zip_code"> · {{ item.zip_code }}</span>
              </p>
            </div>
            <UBadge color="success" variant="subtle">Local</UBadge>
          </div>
        </div>

        <UAlert
          v-else
          color="neutral"
          variant="subtle"
          title="Aucune donnée locale"
          description="Ajoutez un élément depuis le formulaire."
        />

        <UButton
          class="mt-4"
          variant="soft"
          color="neutral"
          icon="i-lucide-refresh-cw"
          block
          @click="loadSaved"
        >
          Actualiser
        </UButton>
      </UCard>
    </div>
  </div>
</template>
