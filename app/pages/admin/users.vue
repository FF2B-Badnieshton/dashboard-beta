<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['admin-auth']
})

interface PersonOption {
  ff2b_id: string
  first_name: string
  last_name: string
  email: string
}

interface StatusOption {
  id: number
  code: string
  label: string
}

interface RoleOption {
  id: number
  code: string
  label: string
}

interface UserRole {
  role_id: number
  access_roles: RoleOption
}

interface UserRecord {
  id: string
  person_id: string
  email: string
  statut?: number | null
  creation_date: string
  persons: PersonOption | null
  users_status: StatusOption | null
  users_roles: UserRole[]
}

interface UserOptionsResponse {
  persons: PersonOption[]
  statuses: StatusOption[]
  roles: RoleOption[]
}

const toast = useToast()

const {
  data: users,
  status: usersStatus,
  refresh: refreshUsers
} = await useFetch<UserRecord[]>('/api/users')
const { data: options, refresh: refreshOptions }
  = await useFetch<UserOptionsResponse>('/api/users/options')

const isOpen = ref(false)
const mode = ref<'create' | 'edit'>('create')
const editableId = ref<string | null>(null)
const saving = ref(false)
const errorMessage = ref('')

const form = reactive({
  person_id: '',
  email: '',
  password: '',
  statut: undefined as number | undefined,
  role_ids: [] as number[]
})

const personItems = computed(() =>
  (options.value?.persons ?? []).map(person => ({
    label: `${person.first_name} ${person.last_name} (${person.email})`,
    value: person.ff2b_id
  }))
)

const statusItems = computed(() =>
  (options.value?.statuses ?? []).map(statusEntry => ({
    label: `${statusEntry.label} (${statusEntry.code})`,
    value: statusEntry.id
  }))
)

const resetForm = () => {
  editableId.value = null
  mode.value = 'create'
  errorMessage.value = ''
  Object.assign(form, {
    person_id: options.value?.persons[0]?.ff2b_id ?? '',
    email: '',
    password: '',
    statut: options.value?.statuses[0]?.id ?? undefined,
    role_ids: []
  })
}

const openCreate = () => {
  resetForm()
  isOpen.value = true
}

const openEdit = (user: UserRecord) => {
  mode.value = 'edit'
  editableId.value = user.id
  errorMessage.value = ''
  Object.assign(form, {
    person_id: user.person_id,
    email: user.email,
    password: '',
    statut: user.statut ?? undefined,
    role_ids: user.users_roles.map(entry => entry.role_id)
  })
  isOpen.value = true
}

const closeModal = () => {
  isOpen.value = false
  resetForm()
}

const toggleRole = (roleId: number, checked: boolean) => {
  if (checked) {
    if (!form.role_ids.includes(roleId)) {
      form.role_ids.push(roleId)
    }
    return
  }

  form.role_ids = form.role_ids.filter(entry => entry !== roleId)
}

const save = async () => {
  errorMessage.value = ''

  if (!form.person_id || !form.email) {
    errorMessage.value = 'Personne et email sont requis.'
    return
  }

  if (mode.value === 'create' && form.password.trim().length < 8) {
    errorMessage.value = 'Le mot de passe doit contenir au moins 8 caractères.'
    return
  }

  saving.value = true

  try {
    const payload = {
      person_id: form.person_id,
      email: form.email,
      password: form.password.trim().length > 0 ? form.password : undefined,
      statut: form.statut ?? null,
      role_ids: form.role_ids
    }

    if (mode.value === 'create') {
      await $fetch('/api/users', {
        method: 'POST',
        body: payload
      })
    } else if (editableId.value) {
      await $fetch(`/api/users/${editableId.value}`, {
        method: 'PUT',
        body: payload
      })
    }

    await refreshUsers()
    closeModal()
    toast.add({
      title: 'Utilisateur enregistré',
      color: 'success'
    })
  } catch (error) {
    errorMessage.value = (error as Error).message
  } finally {
    saving.value = false
  }
}

const remove = async (id: string) => {
  await $fetch(`/api/users/${id}`, { method: 'DELETE' })
  await refreshUsers()
  toast.add({
    title: 'Utilisateur supprimé',
    color: 'success'
  })
}

await refreshOptions()
resetForm()
</script>

<template>
  <div>
    <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <UPageHeader
        title="Comptes utilisateurs"
        description="Gestion des comptes applicatifs, rôles et mots de passe hashés en base."
      />
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-user-plus"
          @click="openCreate()"
        >
          Ajouter un compte
        </UButton>
        <UButton
          icon="i-lucide-refresh-cw"
          variant="soft"
          @click="refreshUsers()"
        >
          Actualiser
        </UButton>
      </div>
    </div>

    <UCard>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-default">
              <th class="px-3 py-2 text-left font-medium">
                Email
              </th>
              <th class="px-3 py-2 text-left font-medium">
                Personne liée
              </th>
              <th class="px-3 py-2 text-left font-medium">
                Statut
              </th>
              <th class="px-3 py-2 text-left font-medium">
                Rôles
              </th>
              <th class="px-3 py-2 text-left font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in users ?? []"
              :key="user.id"
              class="border-b border-default/60"
            >
              <td class="px-3 py-2">
                {{ user.email }}
              </td>
              <td class="px-3 py-2">
                {{
                  user.persons
                    ? `${user.persons.first_name} ${user.persons.last_name}`
                    : "—"
                }}
              </td>
              <td class="px-3 py-2">
                {{ user.users_status?.label ?? "—" }}
              </td>
              <td class="px-3 py-2">
                {{
                  user.users_roles
                    .map((entry) => entry.access_roles.label)
                    .join(", ") || "—"
                }}
              </td>
              <td class="px-3 py-2">
                <div class="flex items-center gap-2">
                  <UButton
                    size="xs"
                    variant="soft"
                    icon="i-lucide-pencil"
                    @click="openEdit(user)"
                  >
                    Modifier
                  </UButton>
                  <UButton
                    size="xs"
                    color="error"
                    variant="soft"
                    icon="i-lucide-trash"
                    @click="remove(user.id)"
                  >
                    Supprimer
                  </UButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-if="usersStatus === 'pending'"
        class="pt-4 text-sm text-muted"
      >
        Chargement en cours...
      </div>
    </UCard>
  </div>

    <UModal v-model:open="isOpen">
    <template #content>
      <UCard class="w-full max-w-2xl">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">
              {{ mode === "create" ? "Créer un compte" : "Modifier un compte" }}
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
            class="md:col-span-2"
            label="Personne liée"
          >
            <USelect
              v-model="form.person_id"
              :items="personItems"
              placeholder="Choisir une personne"
            />
          </UFormField>
          <UFormField label="Email">
            <UInput
              v-model="form.email"
              type="email"
            />
          </UFormField>
          <UFormField
            :label="
              mode === 'create'
                ? 'Mot de passe'
                : 'Nouveau mot de passe (optionnel)'
            "
          >
            <UInput
              v-model="form.password"
              type="password"
              placeholder="Minimum 8 caractères"
            />
          </UFormField>
          <UFormField
            class="md:col-span-2"
            label="Statut"
          >
            <USelect
              v-model="form.statut"
              :items="statusItems"
              placeholder="Choisir un statut"
            />
          </UFormField>
          <div class="md:col-span-2">
            <p class="mb-2 text-sm font-medium">
              Rôles d'accès
            </p>
            <div class="grid gap-2 sm:grid-cols-2">
              <label
                v-for="role in options?.roles ?? []"
                :key="role.id"
                class="flex items-center gap-2 rounded border border-default px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  :checked="form.role_ids.includes(role.id)"
                  @change="
                    toggleRole(
                      role.id,
                      ($event.target as HTMLInputElement).checked
                    )
                  "
                >
                <span>{{ role.label }} ({{ role.code }})</span>
              </label>
            </div>
          </div>
        </div>

        <UAlert
          v-if="errorMessage"
          class="mt-4"
          color="error"
          variant="soft"
          :title="errorMessage"
        />

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              variant="soft"
              @click="closeModal()"
            >
              Annuler
            </UButton>
            <UButton
              :loading="saving"
              @click="save()"
            >
              {{ mode === "create" ? "Créer" : "Enregistrer" }}
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
    </UModal>
  </div>
</template>
