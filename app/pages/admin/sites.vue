<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: ["admin-auth"],
});

const saving = ref(false);
const formError = ref("");

interface PracticeSiteRecord {
  id: number;
  name: string;
  municipality_id: number;
  address?: string | null;
  opening_date?: string | null;
  closing_date?: string | null;
  municipalities?: {
    id: number;
    name: string;
  } | null;
}

interface MunicipalityOption {
  id: number;
  name: string;
  insee_code?: string | null;
}

interface AddressSuggestion {
  label: string;
  postcode: string;
  city: string;
  citycode: string;
  type: string;
}

const addressQuery = ref("");
const addressSuggestions = ref<AddressSuggestion[]>([]);
const searchingAddress = ref(false);
const addressError = ref("");

const searchAddresses = async () => {
  const query = addressQuery.value.trim();

  addressError.value = "";
  addressSuggestions.value = [];

  if (query.length < 3) {
    addressError.value = "Saisis au moins 3 caractères.";
    return;
  }

  searchingAddress.value = true;

  try {
    addressSuggestions.value = await $fetch<AddressSuggestion[]>(
      "/api/practice-sites/address-search",
      {
        query: { q: query },
      },
    );

    if (addressSuggestions.value.length === 0) {
      addressError.value = "Aucune adresse trouvée.";
    }
  } catch {
    addressError.value = "Impossible de rechercher les adresses.";
  } finally {
    searchingAddress.value = false;
  }
};

const selectAddress = (suggestion: AddressSuggestion) => {
  form.address = suggestion.label;

  // Rattacher automatiquement la commune si son code INSEE
  // correspond à celui fourni par l'API.
  const municipality = municipalities.value?.find(
    (item) => item.insee_code === suggestion.citycode,
  );

  if (municipality) {
    form.municipality_id = municipality.id;
  }

  addressQuery.value = suggestion.label;
  addressSuggestions.value = [];
  addressError.value = "";
};

const columns = [
  { accessorKey: "name", header: "Nom du site" },
  { accessorKey: "municipalities.name", header: "Commune" },
  { accessorKey: "address", header: "Adresse" },
  { accessorKey: "opening_date", header: "Ouverture" },
  { accessorKey: "closing_date", header: "Fermeture" },
  { accessorKey: "actions", header: "" },
];

const {
  data: sites,
  status,
  refresh,
} = await useFetch<PracticeSiteRecord[]>("/api/practice-sites");
const { data: municipalities } = await useFetch<MunicipalityOption[]>(
  "/api/municipalities",
);

const isOpen = ref(false);
const mode = ref<"create" | "edit">("create");
const editableId = ref<number | null>(null);

const form = reactive({
  name: "",
  municipality_id: undefined as number | undefined,
  address: "",
  opening_date: "",
  closing_date: "",
});

const resetForm = () => {
  editableId.value = null;
  mode.value = "create";
  Object.assign(form, {
    name: "",
    municipality_id: municipalities.value?.[0]?.id ?? undefined,
    address: "",
    opening_date: "",
    closing_date: "",
  });

  addressQuery.value = "";
  addressSuggestions.value = [];
  addressError.value = "";
};

const openCreate = () => {
  resetForm();
  isOpen.value = true;
};

const openEdit = (site: PracticeSiteRecord) => {
  mode.value = "edit";
  editableId.value = Number(site.id);
  Object.assign(form, {
    name: site.name ?? "",
    municipality_id:
      site.municipality_id ?? municipalities.value?.[0]?.id ?? undefined,
    address: site.address ?? "",
    opening_date: site.opening_date
      ? new Date(site.opening_date).toISOString().slice(0, 10)
      : "",
    closing_date: site.closing_date
      ? new Date(site.closing_date).toISOString().slice(0, 10)
      : "",
  });
  addressQuery.value = form.address;
  isOpen.value = true;
};

const closeModal = () => {
  isOpen.value = false;
  resetForm();
};

const submit = async () => {
  formError.value = "";

  if (!form.name.trim()) {
    formError.value = "Le nom du site est obligatoire.";
    return;
  }

  if (form.municipality_id === undefined) {
    formError.value = "Sélectionne une commune.";
    return;
  }

  if (
    form.opening_date &&
    form.closing_date &&
    form.closing_date < form.opening_date
  ) {
    formError.value =
      "La date de fermeture doit être postérieure à la date d’ouverture.";
    return;
  }

  const payload = {
    name: form.name.trim(),
    municipality_id: form.municipality_id,
    address: form.address.trim() || null,
    opening_date: form.opening_date || null,
    closing_date: form.closing_date || null,
  };

  saving.value = true;

  try {
    if (mode.value === "edit" && editableId.value !== null) {
      await $fetch(`/api/practice-sites/${editableId.value}`, {
        method: "PUT",
        body: payload,
      });
    } else {
      await $fetch("/api/practice-sites", {
        method: "POST",
        body: payload,
      });
    }

    await refresh();
    closeModal();
  } catch (error: any) {
    console.error("Erreur lors de l’enregistrement du site :", error);

    formError.value =
      error?.data?.statusMessage ??
      error?.data?.message ??
      "Impossible d’enregistrer le site. Vérifie les données et réessaie.";
  } finally {
    saving.value = false;
  }
};

const remove = async (id: string | number) => {
  await $fetch(`/api/practice-sites/${Number(id)}`, { method: "DELETE" });
  await refresh();
};
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <UPageHeader
        title="Sites de pratique"
        description="Gestion des lieux de pratique et de leurs informations administratives."
      />
      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-plus" @click="openCreate()"> Ajouter </UButton>
        <UButton icon="i-lucide-refresh-cw" variant="soft" @click="refresh()">
          Actualiser
        </UButton>
      </div>
    </div>

    <UCard>
      <UTable
        :loading="status === 'pending'"
        :data="sites ?? []"
        :columns="columns"
      >
        <template #cell-actions="{ row }">
          <div class="flex items-center gap-2">
            <UButton
              size="xs"
              variant="soft"
              icon="i-lucide-pencil"
              @click="openEdit(row.original)"
            />
            <UButton
              size="xs"
              color="error"
              variant="soft"
              icon="i-lucide-trash"
              @click="remove(row.original.id)"
            />
          </div>
        </template>
      </UTable>
    </UCard>

    <UModal v-model:open="isOpen">
      <template #content>
        <UCard class="w-full max-w-xl">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">
                {{ mode === "create" ? "Ajouter un site" : "Modifier un site" }}
              </h3>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                @click="closeModal()"
              />
            </div>
          </template>

          <div class="grid gap-4 md:grid-cols-2">
            <UFormField label="Nom du site" class="md:col-span-2" required>
              <UInput
                v-model="form.name"
                placeholder="Ex. : Salle des sports Beaulieu"
              />
            </UFormField>

            <UFormField label="Commune" class="md:col-span-2" required>
              <USelect
                v-model="form.municipality_id"
                :items="
                  (municipalities ?? []).map((municipality) => ({
                    label: municipality.name,
                    value: municipality.id,
                  }))
                "
                placeholder="Choisir une commune"
              />
            </UFormField>
            <UFormField label="Rechercher une adresse" class="md:col-span-2">
              <div class="flex gap-2">
                <UInput
                  v-model="addressQuery"
                  class="flex-1"
                  placeholder="Ex. : 12 rue de la Paix, Nantes"
                  @keydown.enter.prevent="searchAddresses()"
                />

                <UButton
                  :loading="searchingAddress"
                  :disabled="addressQuery.trim().length < 3"
                  icon="i-lucide-search"
                  @click="searchAddresses()"
                >
                  Rechercher
                </UButton>
              </div>

              <p v-if="addressError" class="mt-2 text-sm text-muted">
                {{ addressError }}
              </p>

              <div
                v-if="addressSuggestions.length"
                class="mt-2 divide-y divide-default rounded-md border border-default"
              >
                <button
                  v-for="(suggestion, index) in addressSuggestions"
                  :key="`${suggestion.label}-${index}`"
                  type="button"
                  class="w-full p-3 text-left hover:bg-elevated"
                  @click="selectAddress(suggestion)"
                >
                  <span class="block font-medium">
                    {{ suggestion.label }}
                  </span>

                  <span class="text-sm text-muted">
                    {{ suggestion.postcode }} {{ suggestion.city }}
                  </span>
                </button>
              </div>
            </UFormField>

            <UFormField label="Adresse enregistrée" class="md:col-span-2">
              <UInput
                v-model="form.address"
                placeholder="Adresse retenue pour le site"
              />
            </UFormField>
            <UFormField label="Date d'ouverture">
              <UInput v-model="form.opening_date" type="date" />
            </UFormField>

            <UFormField label="Date de fermeture">
              <UInput v-model="form.closing_date" type="date" />
            </UFormField>
          </div>

          <template #footer>
            <div class="w-full space-y-3">
              <p v-if="formError" class="text-sm text-error">
                {{ formError }}
              </p>

              <div class="flex justify-end gap-2">
                <UButton
                  variant="soft"
                  :disabled="saving"
                  @click="closeModal()"
                >
                  Annuler
                </UButton>

                <UButton :loading="saving" :disabled="saving" @click="submit()">
                  {{ mode === "create" ? "Créer le site" : "Enregistrer" }}
                </UButton>
              </div>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
