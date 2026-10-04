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
const modelItems = computed(() =>
  models.value.map((model) => ({ label: model.name, value: model.name })),
);
const relationFields = computed(() =>
  writableFields.value.filter((field) => field.relationModel && field.relationToField),
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
          <USelect
            v-model="selectedModel"
            :items="modelItems"
            :loading="loadingModels"
            class="w-fit sm:min-w-70"
          />
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
            Charger </UButton
          ><UButton
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
          <div>
            <h2 class="font-semibold">
              {{ selectedModel }}
            </h2>
            <p class="text-sm text-muted">
              {{ records.length }} résultat(s) chargé(s)
            </p>
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
