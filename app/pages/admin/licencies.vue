<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['admin-auth']
})

interface PersonRecord {
  ff2b_id: string
  first_name: string
  last_name: string
  birthdate: string
  phone_number: string
  email: string
  status?: string | null
  contact_origin?: string | null
  address?: string | null
  municipality_id?: number | null
}

interface MunicipalityOption {
  id: number
  name: string
}

const columns = [
  { accessorKey: 'last_name', header: 'Nom' },
  { accessorKey: 'first_name', header: 'Prénom' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'phone_number', header: 'Téléphone' },
  { accessorKey: 'birthdate', header: 'Date de naissance' },
  { accessorKey: 'actions', header: '' }
]

const contactOriginOptions = [
  { label: 'Internet', value: 'internet' },
  { label: 'IA', value: 'IA' },
  { label: 'Téléphone', value: 't_l_phone' },
  { label: 'Email', value: 'email' }
]

const {
  data: persons,
  status,
  refresh
} = await useFetch<PersonRecord[]>('/api/persons')
const { data: municipalities } = await useFetch<MunicipalityOption[]>(
  '/api/municipalities'
)

const isOpen = ref(false)
const mode = ref<'create' | 'edit'>('create')
const editableId = ref<string | null>(null)

const form = reactive({
  first_name: '',
  last_name: '',
  birthdate: '',
  phone_number: '',
  email: '',
  status: '',
  contact_origin: 'internet',
  address: '',
  municipality_id: undefined as number | undefined
})

const resetForm = () => {
  editableId.value = null
  mode.value = 'create'
  Object.assign(form, {
    first_name: '',
    last_name: '',
    birthdate: '',
    phone_number: '',
    email: '',
    status: '',
    contact_origin: 'internet',
    address: '',
    municipality_id: municipalities.value?.[0]?.id ?? undefined
  })
}

const openCreate = () => {
  resetForm()
  isOpen.value = true
}

const openEdit = (person: PersonRecord) => {
  mode.value = 'edit'
  editableId.value = person.ff2b_id
  Object.assign(form, {
    first_name: person.first_name ?? '',
    last_name: person.last_name ?? '',
    birthdate: person.birthdate
      ? new Date(person.birthdate).toISOString().slice(0, 10)
      : '',
    phone_number: person.phone_number ?? '',
    email: person.email ?? '',
    status: person.status ?? '',
    contact_origin: person.contact_origin ?? 'internet',
    address: person.address ?? '',
    municipality_id:
      person.municipality_id ?? municipalities.value?.[0]?.id ?? undefined
  })
  isOpen.value = true
}

const closeModal = () => {
  isOpen.value = false
  resetForm()
}

const submit = async () => {
  const payload = {
    first_name: form.first_name,
    last_name: form.last_name,
    birthdate: form.birthdate,
    phone_number: form.phone_number,
    email: form.email,
    status: form.status || null,
    contact_origin: form.contact_origin || 'internet',
    address: form.address || null,
    municipality_id: form.municipality_id ?? null
  }

  if (mode.value === 'edit' && editableId.value) {
    await $fetch(`/api/persons/${editableId.value}`, {
      method: 'PUT',
      body: payload
    })
  } else {
    await $fetch('/api/persons', {
      method: 'POST',
      body: payload
    })
  }

  await refresh()
  closeModal()
}

const remove = async (id: string | number) => {
  await $fetch(`/api/persons/${String(id)}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <UPageHeader
        title="Licenciés"
        description="Gestion des personnes et de leurs informations principales."
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
        :data="persons ?? []"
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
              @click="remove(row.original.ff2b_id)"
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
                  ? "Ajouter un licencié"
                  : "Modifier un licencié"
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
          <UFormField label="Prénom">
            <UInput v-model="form.first_name" />
          </UFormField>
          <UFormField label="Nom">
            <UInput v-model="form.last_name" />
          </UFormField>
          <UFormField label="Email">
            <UInput
              v-model="form.email"
              type="email"
            />
          </UFormField>
          <UFormField label="Téléphone">
            <UInput v-model="form.phone_number" />
          </UFormField>
          <UFormField label="Date de naissance">
            <UInput
              v-model="form.birthdate"
              type="date"
            />
          </UFormField>
          <UFormField label="Statut">
            <UInput v-model="form.status" />
          </UFormField>
          <UFormField
            label="Origine du contact"
            class="md:col-span-2"
          >
            <USelect
              v-model="form.contact_origin"
              :items="contactOriginOptions"
              placeholder="Choisir"
            />
          </UFormField>
          <UFormField
            label="Adresse"
            class="md:col-span-2"
          >
            <UInput v-model="form.address" />
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
