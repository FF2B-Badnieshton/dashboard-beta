<script setup lang="ts">
const navigation = [
  { label: 'Tableau de bord', to: '/admin', icon: 'i-lucide-layout-dashboard' },
  { label: 'Licenciés', to: '/admin/licencies', icon: 'i-lucide-users' },
  { label: 'Sites de pratique', to: '/admin/sites', icon: 'i-lucide-map-pin' },
  { label: 'Référents', to: '/admin/referents', icon: 'i-lucide-shield-check' }
]
</script>

<template>
  <div class="min-h-screen bg-default">
    <UHeader title="FF2B Dashboard">
      <template #left>
        <UNavigationMenu :items="navigation" />
      </template>

      <template #right>
        <UColorModeButton />
      </template>
    </UHeader>

    <UMain class="px-4 py-6 sm:px-6 lg:px-8">
      <slot />
    </UMain>
  </div>
</template>
