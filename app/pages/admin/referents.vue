<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['admin-auth']
})

interface ReferentRecord {
  id: number
  person_id: string
  site_id: number
  start_date: string
  end_date?: string | null
  professional_phone: string
  professional_mail: string
  status?: number | null
  persons?: {
    first_name: string
    last_name: string
    email: string
  } | null
  practice_site?: {
    name: string
  } | null
  referent_status?: {
    label: string
  } | null
}

interface PersonOption {
  ff2b_id: string
  first_name: string
  last_name: string
  email: string
}

interface PracticeSiteOption {
  id: number
  name: string
}

const columns = [
  { accessorKey: 'persons.last_name', header: 'Nom' },
  { accessorKey: 'persons.first_name', header: 'Prénom' },
  { accessorKey: 'practice_site.name', header: 'Site' },
  { accessorKey: 'professional_phone', header: 'Téléphone pro' },
  { accessorKey: 'professional_mail', header: 'Email pro' },
  { accessorKey: 'actions', header: '' }
]

const {
  data: referents,
  status,
  refresh
} = await useFetch<ReferentRecord[]>('/api/referents')
const { data: persons } = await useFetch<PersonOption[]>('/api/persons')
const { data: sites } = await useFetch<PracticeSiteOption[]>(
  '/api/practice-sites'
)

const isOpen = ref(false)
const mode = ref<'create' | 'edit'>('create')
const editableId = ref<number | null>(null)

const form = reactive({
  person_id: '',
  site_id: undefined as number | undefined,
  start_date: '',
  end_date: '',
  professional_phone: '',
  professional_mail: '',
  status: undefined as number | undefined
})

const resetForm = () => {
  editableId.value = null
  mode.value = 'create'
  Object.assign(form, {
    person_id: persons.value?.[0]?.ff2b_id ?? '',
    site_id: sites.value?.[0]?.id ?? undefined,
    start_date: '',
    end_date: '',
    professional_phone: '',
    professional_mail: '',
    status: undefined
  })
}

const openCreate = () => {
  resetForm()
  isOpen.value = true
}

const openEdit = (referent: ReferentRecord) => {
  mode.value = 'edit'
  editableId.value = Number(referent.id)
  Object.assign(form, {
    person_id: referent.person_id ?? '',
    site_id: referent.site_id ?? sites.value?.[0]?.id ?? undefined,
    start_date: referent.start_date
      ? new Date(referent.start_date).toISOString().slice(0, 10)
      : '',
    end_date: referent.end_date
      ? new Date(referent.end_date).toISOString().slice(0, 10)
      : '',
    professional_phone: referent.professional_phone ?? '',
    professional_mail: referent.professional_mail ?? '',
    status: referent.status ?? undefined
  })
  isOpen.value = true
}

const closeModal = () => {
  isOpen.value = false
  resetForm()
}

const submit = async () => {
  const payload = {
    person_id: form.person_id,
    site_id: form.site_id,
    start_date: form.start_date,
    end_date: form.end_date || null,
    professional_phone: form.professional_phone,
    professional_mail: form.professional_mail,
    status: form.status ?? null
  }

  if (mode.value === 'edit' && editableId.value !== null) {
    await $fetch(`/api/referents/${editableId.value}`, {
      method: 'PUT',
      body: payload
    })
  } else {
    await $fetch('/api/referents', {
      method: 'POST',
      body: payload
    })
  }

  await refresh()
  closeModal()
}

const remove = async (id: string | number) => {
  await $fetch(`/api/referents/${Number(id)}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <UPageHeader
        title="Référents"
        description="Gestion des référents associés à un site de pratique."
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
        :data="referents ?? []"
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
      <UCard class="w-full max-w-2xl">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">
              {{
                mode === "create"
                  ? "Ajouter un référent"
                  : "Modifier un référent"
              }}
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
            label="Personne"
            class="md:col-span-2"
          >
            <USelect
              v-model="form.person_id"
              :items="
                (persons ?? []).map((person) => ({
                  label: `${person.first_name} ${person.last_name} (${person.email})`,
                  value: person.ff2b_id
                }))
              "
              placeholder="Choisir une personne"
            />
          </UFormField>
          <UFormField label="Site de pratique">
            <USelect
              v-model="form.site_id"
              :items="
                (sites ?? []).map((site) => ({
                  label: site.name,
                  value: site.id
                }))
              "
              placeholder="Choisir un site"
            />
          </UFormField>
          <UFormField label="Statut">
            <UInput
              v-model.number="form.status"
              type="number"
            />
          </UFormField>
          <UFormField label="Date de début">
            <UInput
              v-model="form.start_date"
              type="date"
            />
          </UFormField>
          <UFormField label="Date de fin">
            <UInput
              v-model="form.end_date"
              type="date"
            />
          </UFormField>
          <UFormField label="Téléphone professionnel">
            <UInput v-model="form.professional_phone" />
          </UFormField>
          <UFormField label="Email professionnel">
            <UInput
              v-model="form.professional_mail"
              type="email"
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
