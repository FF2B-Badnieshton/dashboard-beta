<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['admin-auth']
})

interface Licencie {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
}

const columns = [
  { accessorKey: 'first_name', header: 'Prénom' },
  { accessorKey: 'last_name', header: 'Nom' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'role', header: 'Rôle' }
]

const { data, status, refresh } = await useFetch<Licencie[]>('/api/persons')
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <UPageHeader
        title="Licenciés"
        description="Données récupérées via Nitro + Prisma."
      />
      <UButton
        icon="i-lucide-refresh-cw"
        variant="soft"
        @click="refresh()"
      >
        Actualiser
      </UButton>
    </div>

    <UCard>
      <UTable
        :loading="status === 'pending'"
        :data="data ?? []"
        :columns="columns"
      />
    </UCard>
  </div>
</template>
