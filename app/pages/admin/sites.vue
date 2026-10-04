<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['admin-auth']
})

interface PracticeSiteRecord {
  id: number
  name: string
  municipality_id: number
  address?: string | null
  opening_date?: string | null
  closing_date?: string | null
  municipalities?: {
    id: number
    name: string
  } | null
}

interface MunicipalityOption {
  id: number
  name: string
}

const columns = [
  { accessorKey: 'name', header: 'Nom du site' },
  { accessorKey: 'municipalities.name', header: 'Commune' },
  { accessorKey: 'address', header: 'Adresse' },
  { accessorKey: 'opening_date', header: 'Ouverture' },
  { accessorKey: 'closing_date', header: 'Fermeture' },
  { accessorKey: 'actions', header: '' }
]

const {
  data: sites,
  status,
  refresh
} = await useFetch<PracticeSiteRecord[]>('/api/practice-sites')
const { data: municipalities } = await useFetch<MunicipalityOption[]>(
  '/api/municipalities'
)

const isOpen = ref(false)
const mode = ref<'create' | 'edit'>('create')
const editableId = ref<number | null>(null)

const form = reactive({
  name: '',
  municipality_id: undefined as number | undefined,
  address: '',
  opening_date: '',
  closing_date: ''
})

const resetForm = () => {
  editableId.value = null
  mode.value = 'create'
  Object.assign(form, {
    name: '',
    municipality_id: municipalities.value?.[0]?.id ?? undefined,
    address: '',
    opening_date: '',
    closing_date: ''
  })
}

const openCreate = () => {
  resetForm()
  isOpen.value = true
}

const openEdit = (site: PracticeSiteRecord) => {
  mode.value = 'edit'
  editableId.value = Number(site.id)
  Object.assign(form, {
    name: site.name ?? '',
    municipality_id:
      site.municipality_id ?? municipalities.value?.[0]?.id ?? undefined,
    address: site.address ?? '',
    opening_date: site.opening_date
      ? new Date(site.opening_date).toISOString().slice(0, 10)
      : '',
    closing_date: site.closing_date
      ? new Date(site.closing_date).toISOString().slice(0, 10)
      : ''
  })
  isOpen.value = true
}

const closeModal = () => {
  isOpen.value = false
  resetForm()
}

const submit = async () => {
  const payload = {
    name: form.name,
    municipality_id: form.municipality_id,
    address: form.address || null,
    opening_date: form.opening_date || null,
    closing_date: form.closing_date || null
  }

  if (mode.value === 'edit' && editableId.value !== null) {
    await $fetch(`/api/practice-sites/${editableId.value}`, {
      method: 'PUT',
      body: payload
    })
  } else {
    await $fetch('/api/practice-sites', {
      method: 'POST',
      body: payload
    })
  }

  await refresh()
  closeModal()
}

const remove = async (id: string | number) => {
  await $fetch(`/api/practice-sites/${Number(id)}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <UPageHeader
        title="Sites de pratique"
        description="Gestion des lieux de pratique et de leurs informations administratives."
      />
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-plus"
          @click="openCreate()"
        >
          Ajouter
        </UButton>
        <UButton
          icon="i-lucide-refresh-cw"
          variant="soft"
          @click="refresh()"
        >
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
          <UFormField
            label="Nom du site"
            class="md:col-span-2"
          >
            <UInput v-model="form.name" />
          </UFormField>
          <UFormField
            label="Commune"
            class="md:col-span-2"
          >
            <USelect
              v-model="form.municipality_id"
              :items="
                (municipalities ?? []).map((municipality) => ({
                  label: municipality.name,
                  value: municipality.id
                }))
              "
              placeholder="Choisir une commune"
            />
          </UFormField>
          <UFormField
            label="Adresse"
            class="md:col-span-2"
          >
            <UInput v-model="form.address" />
          </UFormField>
          <UFormField label="Date d'ouverture">
            <UInput
              v-model="form.opening_date"
              type="date"
            />
          </UFormField>
          <UFormField label="Date de fermeture">
            <UInput
              v-model="form.closing_date"
              type="date"
            />
          </UFormField>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              variant="soft"
              @click="closeModal()"
            >
              Annuler
            </UButton>
            <UButton @click="submit()">
              {{ mode === "create" ? "Créer" : "Enregistrer" }}
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
    </UModal>
  </div>
</template>
