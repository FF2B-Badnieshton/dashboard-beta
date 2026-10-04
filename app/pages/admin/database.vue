<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
definePageMeta({ layout: "dashboard", middleware: ["admin-auth"] });

type DbField = {
  name: string;
  kind: string;
  type: string;
  isRequired: boolean;
  isList: boolean;
  isId: boolean;
  isUnique: boolean;
  hasDefaultValue: boolean;
  relationName: string | null;
  relationModel: string | null;
  relationToField: string | null;
  enumValues: string[] | null;
};
type DbModel = { name: string; idFields: string[]; fields: DbField[] };
type FormValue = string | number | boolean | undefined;
type DbRow = Record<string, unknown>;
type SelectItem = { label: string; value: string | number };
type TableCategory = {
  key: string;
  label: string;
  description: string;
  icon: string;
  models: DbModel[];
};

const toast = useToast();
const models = ref<DbModel[]>([]);
const selectedModel = ref("");
const records = ref<DbRow[]>([]);
const loadingModels = ref(false);
const loadingRecords = ref(false);
const saving = ref(false);
const errorMessage = ref("");
const editing = ref(false);
const editingWhere = ref<Record<string, unknown>>({});
const values = reactive<Record<string, any>>({});
const whereJson = ref("{}");
const orderByJson = ref("{}");
const take = ref(50);
const skip = ref(0);
const relationOptions = ref<Record<string, SelectItem[]>>({});
const modelSearch = ref("");

const selectedMeta = computed(() =>
  models.value.find((model) => model.name === selectedModel.value),
);
const fields = computed(() => selectedMeta.value?.fields ?? []);
const writableFields = computed(() =>
  fields.value.filter(
    (field) =>
      (field.kind === "scalar" || field.kind === "enum") &&
      !field.isId &&
      !field.isList,
  ),
);
const tableFields = computed(() =>
  fields.value
    .filter(
      (field) =>
        (field.kind === "scalar" || field.kind === "enum") && !field.isList,
    )
    .slice(0, 7),
);
const categoryDefinitions = [
  {
    key: "people",
    label: "Personnes & licences",
    description: "Licenciés, utilisateurs et rôles",
    icon: "i-lucide-users",
    matches: ["person", "user", "license", "role", "referent", "prospect", "volunteer"],
  },
  {
    key: "competition",
    label: "Compétitions",
    description: "Compétitions et participants",
    icon: "i-lucide-trophy",
    matches: ["competition", "season", "game", "team"],
  },
  {
    key: "practice",
    label: "Pratique sportive",
    description: "Séances, créneaux et sites",
    icon: "i-lucide-map-pin",
    matches: ["session", "slot", "practice", "format"],
  },
  {
    key: "organizations",
    label: "Organisations",
    description: "Structures, contacts et territoires",
    icon: "i-lucide-building-2",
    matches: ["organization", "contact", "country", "department", "region", "municipalit"],
  },
  {
    key: "content",
    label: "Documents & projets",
    description: "Documents et espaces de travail",
    icon: "i-lucide-folder-kanban",
    matches: ["document", "project", "consent"],
  },
  {
    key: "system",
    label: "Configuration & système",
    description: "Paramètres, historiques et journaux",
    icon: "i-lucide-settings-2",
    matches: ["access", "log", "payment", "type", "status"],
  },
] as const;

const categoryForModel = (model: DbModel) => {
  const normalizedName = model.name.toLowerCase();
  return (
    categoryDefinitions.find((category) =>
      category.matches.some((match) => normalizedName.includes(match)),
    ) ?? {
      key: "other",
      label: "Autres tables",
      description: "Tables complémentaires",
      icon: "i-lucide-table-2",
    }
  );
};

const filteredModels = computed(() => {
  const search = modelSearch.value.trim().toLowerCase();
  if (!search) return models.value;
  return models.value.filter((model) => model.name.toLowerCase().includes(search));
});

const modelCategories = computed<TableCategory[]>(() => {
  const categories = new Map<string, TableCategory>();
  for (const definition of categoryDefinitions) {
    categories.set(definition.key, { ...definition, models: [] });
  }
  categories.set("other", {
    key: "other",
    label: "Autres tables",
    description: "Tables complémentaires",
    icon: "i-lucide-table-2",
    models: [],
  });
  for (const model of filteredModels.value) {
    const category = categoryForModel(model);
    categories.get(category.key)?.models.push(model);
  }
  return [...categories.values()].filter((category) => category.models.length);
});

const selectedCategory = computed(() =>
  selectedMeta.value ? categoryForModel(selectedMeta.value) : undefined,
);
const relationFields = computed(() =>
  writableFields.value.filter(
    (field) => field.relationModel && field.relationToField,
  ),
);

const display = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const errorText = (error: any) =>
  error?.data?.statusMessage ||
  error?.statusMessage ||
  error?.message ||
  "Une erreur est survenue.";
const parseObject = (text: string, label: string) => {
  try {
    const result = JSON.parse(text || "{}");
    if (!result || Array.isArray(result) || typeof result !== "object")
      throw new Error();
    return result;
  } catch {
    throw new Error(`${label} doit être un objet JSON valide.`);
  }
};

const clearValues = () => {
  Object.assign(
    values,
    Object.fromEntries(Object.keys(values).map((key) => [key, undefined])),
  );
};

const formatValue = (field: DbField, value: unknown): FormValue => {
  if (value === null || value === undefined)
    return field.type === "Boolean" ? false : "";
  if (
    field.type === "DateTime" &&
    (typeof value === "string" || typeof value === "number")
  )
    return new Date(value).toISOString().slice(0, 16);
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return value;
  return String(value);
};

const loadModels = async () => {
  loadingModels.value = true;
  try {
    models.value = await $fetch<DbModel[]>("/api/db/models");
    if (!selectedModel.value && models.value[0])
      selectedModel.value = models.value[0].name;
  } catch (error) {
    errorMessage.value = errorText(error);
  } finally {
    loadingModels.value = false;
  }
};

const loadRecords = async () => {
  if (!selectedModel.value) return;
  loadingRecords.value = true;
  errorMessage.value = "";
  try {
    const args: Record<string, unknown> = {
      take: Math.min(Math.max(take.value, 1), 200),
      skip: Math.max(skip.value, 0),
    };
    const where = parseObject(whereJson.value, "Le filtre");
    const orderBy = parseObject(orderByJson.value, "Le tri");
    if (Object.keys(where).length) args.where = where;
    if (Object.keys(orderBy).length) args.orderBy = orderBy;
    records.value = await $fetch<DbRow[]>("/api/db/records", {
      method: "POST",
      body: { model: selectedModel.value, action: "findMany", args },
    });
  } catch (error) {
    errorMessage.value = errorText(error);
  } finally {
    loadingRecords.value = false;
  }
};

const loadRelationOptions = async () => {
  relationOptions.value = {};
  if (!selectedModel.value || !relationFields.value.length) return;

  try {
    const entries = await Promise.all(
      relationFields.value.map(async (field) => {
        const response = await $fetch<{ options: SelectItem[] }>(
          "/api/db/relation-options",
          { query: { model: selectedModel.value, field: field.name } },
        );
        return [field.name, response.options] as const;
      }),
    );
    relationOptions.value = Object.fromEntries(entries);
  } catch (error) {
    errorMessage.value = errorText(error);
  }
};

const openCreate = () => {
  editing.value = false;
  editingWhere.value = {};
  clearValues();
  for (const field of writableFields.value)
    values[field.name] = field.type === "Boolean" ? false : "";
};

const openEdit = (record: DbRow) => {
  editing.value = true;
  editingWhere.value = Object.fromEntries(
    (selectedMeta.value?.idFields ?? []).map((id) => [id, record[id]]),
  );
  clearValues();
  for (const field of writableFields.value)
    values[field.name] = formatValue(field, record[field.name]);
};

const save = async () => {
  saving.value = true;
  errorMessage.value = "";
  try {
    const data: Record<string, unknown> = {};
    for (const field of writableFields.value) {
      const value = values[field.name];
      if (value !== "" && value !== null && value !== undefined)
        data[field.name] = value;
      else if (!field.isRequired && !field.hasDefaultValue)
        data[field.name] = null;
    }
    const action = editing.value ? "update" : "create";
    const args = editing.value ? { where: editingWhere.value, data } : { data };
    await $fetch("/api/db/records", {
      method: "POST",
      body: { model: selectedModel.value, action, args },
    });
    toast.add({
      title: editing.value ? "Enregistrement modifié" : "Enregistrement créé",
      color: "success",
    });
    await loadRecords();
    if (!editing.value) openCreate();
  } catch (error) {
    errorMessage.value = errorText(error);
  } finally {
    saving.value = false;
  }
};

const remove = async (record: DbRow) => {
  if (
    !confirm(
      "Supprimer cet enregistrement ? Cette action peut être irréversible.",
    )
  )
    return;
  try {
    const where = Object.fromEntries(
      (selectedMeta.value?.idFields ?? []).map((id) => [id, record[id]]),
    );
    await $fetch("/api/db/records", {
      method: "POST",
      body: { model: selectedModel.value, action: "delete", args: { where } },
    });
    toast.add({ title: "Enregistrement supprimé", color: "success" });
    await loadRecords();
  } catch (error) {
    errorMessage.value = errorText(error);
  }
};

watch(selectedModel, async () => {
  openCreate();
  await Promise.all([loadRecords(), loadRelationOptions()]);
});
await loadModels();
openCreate();
await Promise.all([loadRecords(), loadRelationOptions()]);
</script>

<template>
  <div class="space-y-6">
    <UPageHeader
      title="Explorateur de base de données"
      description="Gérez toutes les tables et leurs statuts depuis une interface visuelle."
    />

    <UCard>
      <div
        class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_110px_110px_auto] lg:items-end"
      >
        <UFormField
          label="Table / modèle"
          help="Les champs et relations sont déduits du schéma Prisma."
        >
          <div class="relative">
            <UInput
              v-model="modelSearch"
              icon="i-lucide-search"
              placeholder="Rechercher une table..."
              :loading="loadingModels"
            />
            <div class="mt-2 max-h-72 overflow-y-auto rounded-lg border border-default bg-default p-2 shadow-sm">
              <div v-if="!modelCategories.length" class="px-3 py-6 text-center text-sm text-muted">
                Aucune table trouvée.
              </div>
              <details
                v-for="category in modelCategories"
                :key="category.key"
                open
                class="group"
              >
                <summary class="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-elevated">
                  <UIcon :name="category.icon" class="size-4 text-primary" />
                  <span class="min-w-0 flex-1">
                    <span class="block font-medium">{{ category.label }}</span>
                    <span class="block text-xs text-muted">{{ category.description }}</span>
                  </span>
                  <UBadge color="neutral" variant="soft">{{ category.models.length }}</UBadge>
                  <UIcon name="i-lucide-chevron-down" class="size-4 transition-transform group-open:rotate-180" />
                </summary>
                <div class="grid gap-1 pb-1 pt-1 sm:grid-cols-2">
                  <button
                    v-for="model in category.models"
                    :key="model.name"
                    type="button"
                    class="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-primary/10"
                    :class="selectedModel === model.name ? 'bg-primary/10 font-semibold text-primary' : 'text-default'"
                    @click="selectedModel = model.name"
                  >
                    <UIcon name="i-lucide-table-2" class="size-4 shrink-0" />
                    <span class="truncate">{{ model.name }}</span>
                    <UIcon v-if="selectedModel === model.name" name="i-lucide-check" class="ml-auto size-4 shrink-0" />
                  </button>
                </div>
              </details>
            </div>
          </div>
        </UFormField>
        <UFormField label="Limite">
          <UInput v-model.number="take" type="number" min="1" max="200" />
        </UFormField>
        <UFormField label="Décalage">
          <UInput v-model.number="skip" type="number" min="0" />
        </UFormField>
        <div class="flex gap-2">
          <UButton
            icon="i-lucide-search"
            :loading="loadingRecords"
            @click="loadRecords"
          >
            Charger
          </UButton>

          <UButton
            icon="i-lucide-refresh-cw"
            variant="soft"
            @click="loadModels"
          >
            Tables
          </UButton>
        </div>
      </div>
      <div class="mt-4 grid gap-4 md:grid-cols-2">
        <UFormField label="Filtre avancé (JSON)">
          <UTextarea v-model="whereJson" :rows="3" />
        </UFormField>
        <UFormField label="Tri avancé (JSON)">
          <UTextarea v-model="orderByJson" :rows="3" />
        </UFormField>
      </div>
      <UAlert
        v-if="errorMessage"
        class="mt-4"
        color="error"
        variant="soft"
        :title="errorMessage"
      />
    </UCard>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <UCard>
        <div class="mb-4 flex items-center justify-between">
          <div class="flex min-w-0 items-center gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UIcon :name="selectedCategory?.icon ?? 'i-lucide-table-2'" class="size-5" />
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="truncate font-semibold">{{ selectedModel }}</h2>
                <UBadge v-if="selectedCategory" color="primary" variant="soft">{{ selectedCategory.label }}</UBadge>
              </div>
              <p class="text-sm text-muted">
                {{ records.length }} résultat(s) chargé(s) · {{ fields.length }} champ(s)
              </p>
            </div>
          </div>
          <UButton size="sm" icon="i-lucide-plus" @click="openCreate">
            Nouveau
          </UButton>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="border-b border-default">
                <th
                  v-for="field in tableFields"
                  :key="field.name"
                  class="px-3 py-2 text-left font-medium"
                >
                  {{ field.name }}
                </th>
                <th class="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(record, index) in records"
                :key="index"
                class="border-b border-default/60"
              >
                <td
                  v-for="field in tableFields"
                  :key="field.name"
                  class="max-w-48 truncate px-3 py-2"
                >
                  {{ display(record[field.name]) }}
                </td>
                <td class="px-3 py-2">
                  <div class="flex justify-end gap-1">
                    <UButton
                      size="xs"
                      variant="soft"
                      icon="i-lucide-pencil"
                      aria-label="Modifier"
                      @click="openEdit(record)"
                    /><UButton
                      size="xs"
                      color="error"
                      variant="soft"
                      icon="i-lucide-trash-2"
                      aria-label="Supprimer"
                      @click="remove(record)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <p
            v-if="!records.length && !loadingRecords"
            class="py-10 text-center text-sm text-muted"
          >
            Aucun enregistrement pour ce filtre.
          </p>
        </div>
      </UCard>

      <UCard>
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h2 class="font-semibold">
              {{ editing ? "Modifier" : "Ajouter" }}
            </h2>
            <p class="text-sm text-muted">
              {{ selectedModel }}
            </p>
          </div>
          <UBadge v-if="editing" color="warning"> édition </UBadge>
        </div>
        <div class="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
          <UFormField
            v-for="field in writableFields"
            :key="field.name"
            :label="field.name"
            :required="field.isRequired"
          >
            <USelect
              v-if="field.enumValues?.length"
              v-model="values[field.name]"
              :items="
                field.enumValues.map((value) => ({ label: value, value }))
              "
              :placeholder="field.isRequired ? 'Choisir' : 'Non défini'"
            />
            <USelect
              v-else-if="field.relationModel"
              v-model="values[field.name]"
              :items="relationOptions[field.name] ?? []"
              :loading="!relationOptions[field.name]"
              :placeholder="field.isRequired ? 'Choisir' : 'Non défini'"
              searchable
            />
            <USelect
              v-else-if="field.type === 'Boolean'"
              v-model="values[field.name]"
              :items="[
                { label: 'Oui', value: true },
                { label: 'Non', value: false },
              ]"
            />
            <UTextarea
              v-else-if="field.type === 'Json'"
              v-model="values[field.name]"
              :rows="3"
            />
            <UInput
              v-else
              v-model="values[field.name]"
              :type="
                field.type === 'DateTime'
                  ? 'datetime-local'
                  : ['Int', 'Float', 'Decimal', 'BigInt'].includes(field.type)
                    ? 'number'
                    : 'text'
              "
            />
          </UFormField>
        </div>
        <UAlert
          v-if="!writableFields.length"
          class="mt-4"
          color="warning"
          variant="soft"
          title="Cette table ne contient aucun champ éditable."
        />
        <div class="mt-5 flex gap-2">
          <UButton
            :disabled="!writableFields.length"
            :loading="saving"
            icon="i-lucide-save"
            @click="save"
          >
            {{ editing ? "Enregistrer" : "Créer" }} </UButton
          ><UButton variant="soft" @click="openCreate"> Réinitialiser </UButton>
        </div>
      </UCard>
    </div>
  </div>
</template>
