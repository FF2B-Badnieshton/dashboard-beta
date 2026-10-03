<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['admin-auth']
})

const cards = [
  { title: 'Licenciés', value: '30', description: 'Membres actifs', icon: 'i-lucide-users' },
  { title: 'Référents', value: '3', description: 'Encadrants déclarés', icon: 'i-lucide-shield-check' },
  { title: 'Sites', value: 'À configurer', description: 'Lieux de pratique', icon: 'i-lucide-map-pin' }
]
</script>

<template>
  <div class="space-y-6">
    <UPageHeader
      title="Tableau de bord"
      description="Prototype d'administration centralisée FF2B."
    />

    <div class="grid gap-4 md:grid-cols-3">
      <UCard
        v-for="card in cards"
        :key="card.title"
      >
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm text-muted">
              {{ card.title }}
            </p>
            <p class="mt-1 text-2xl font-semibold">
              {{ card.value }}
            </p>
            <p class="text-xs text-muted">
              {{ card.description }}
            </p>
          </div>
          <UIcon
            :name="card.icon"
            class="size-5 text-primary"
          />
        </div>
      </UCard>
    </div>

    <UCard>
      <p class="text-sm text-muted">
        Cette V1 privilégie l'exploration des flux CRUD via les routes <code>/server/api</code>.
      </p>
    </UCard>
  </div>
</template>
