<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['admin-auth']
})
</script>

<template>
  <UCard>
    <h1 class="text-lg font-semibold">
      Sites de pratique
    </h1>
    <p class="text-sm text-muted">
      Module prêt pour les opérations CRUD.
    </p>
  </UCard>
</template>
