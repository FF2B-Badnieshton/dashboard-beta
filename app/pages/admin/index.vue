<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['admin-auth'] })

const { data: stats, status, refresh } = await useFetch('/api/dashboard/stats')
const cards = computed(() => [
  { title: 'Licenciés', value: stats.value?.persons ?? 0, description: 'Personnes enregistrées', icon: 'i-lucide-users', to: '/admin/licencies' },
  { title: 'Licences', value: stats.value?.licenses ?? 0, description: 'Dossiers de licence', icon: 'i-lucide-badge-check', to: '/admin/database' },
  { title: 'Paiements', value: stats.value?.payments ?? 0, description: `${stats.value?.pendingPayments ?? 0} en attente`, icon: 'i-lucide-credit-card', to: '/admin/database' },
  { title: 'Sites', value: stats.value?.sites ?? 0, description: 'Lieux de pratique', icon: 'i-lucide-map-pin', to: '/admin/sites' },
  { title: 'Référents', value: stats.value?.referents ?? 0, description: 'Encadrants déclarés', icon: 'i-lucide-shield-check', to: '/admin/referents' }
])
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <UPageHeader
        title="Tableau de bord"
        description="Pilotez vos données de test, vos statuts et vos opérations depuis un seul espace."
      />
      <UButton
        class="mt-2"
        variant="soft"
        icon="i-lucide-refresh-cw"
        :loading="status === 'pending'"
        @click="refresh()"
      >
        Actualiser
      </UButton>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <NuxtLink
        v-for="card in cards"
        :key="card.title"
        :to="card.to"
        class="group"
      >
        <UCard class="h-full transition group-hover:-translate-y-0.5 group-hover:ring-primary">
          <div class="flex items-start justify-between"><div><p class="text-sm text-muted">{{ card.title }}</p><p class="mt-2 text-3xl font-semibold">{{ card.value }}</p><p class="mt-1 text-xs text-muted">{{ card.description }}</p></div><UIcon
            :name="card.icon"
            class="size-5 text-primary"
          /></div>
        </UCard>
      </NuxtLink>
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <UCard class="lg:col-span-2">
        <template #header>
          <h2 class="font-semibold">
            Actions rapides
          </h2>
        </template><div class="grid gap-3 sm:grid-cols-3">
          <NuxtLink
            v-for="action in [{ label: 'Ajouter un licencié', to: '/admin/licencies', icon: 'i-lucide-user-plus' }, { label: 'Gérer les sites', to: '/admin/sites', icon: 'i-lucide-map-pin-plus' }, { label: 'Explorer une table', to: '/admin/database', icon: 'i-lucide-table-2' }]"
            :key="action.label"
            :to="action.to"
          ><UButton
            block
            variant="soft"
            :icon="action.icon"
          >{{ action.label }}</UButton></NuxtLink>
        </div>
      </UCard>
      <UCard>
        <template #header>
          <h2 class="font-semibold">
            Espace de test
          </h2>
        </template><p class="text-sm leading-6 text-muted">
          L’explorateur de base de données permet de créer, modifier et supprimer les enregistrements de toutes les tables, avec conversion automatique des dates, nombres, enums et booléens.
        </p><NuxtLink
          to="/admin/database"
          class="mt-4 inline-flex"
        ><UButton size="sm">Ouvrir l’explorateur</UButton></NuxtLink>
      </UCard>
    </div>
  </div>
</template>
