<script setup lang="ts">
definePageMeta({ layout: 'default' })

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')
const registered = computed(() => useRoute().query.registered === '1')

const handleLogin = async () => {
  errorMessage.value = ''
  loading.value = true

  try {
    await $fetch('/api/session/login', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value
      }
    })

    await navigateTo('/admin')
  } catch (error) {
    errorMessage.value = (error as Error).message || 'Connexion impossible.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-md items-center px-4">
    <UCard class="w-full">
      <template #header>
        <div>
          <h1 class="text-lg font-semibold">
            Connexion au dashboard FF2B
          </h1>
          <p class="text-sm text-muted">
            Authentification serveur via Nitro + Prisma.
          </p>
        </div>
      </template>

      <UForm
        class="space-y-4"
        @submit.prevent="handleLogin"
      >
        <UFormField
          label="Email"
          required
        >
          <UInput
            v-model="email"
            type="email"
            placeholder="francis@ff2b.fr"
          />
        </UFormField>

        <UFormField
          label="Mot de passe"
          required
        >
          <UInput
            v-model="password"
            type="password"
            placeholder="••••••••"
          />
        </UFormField>

        <UAlert
          v-if="registered"
          color="success"
          variant="soft"
          title="Compte créé. Vous pouvez maintenant vous connecter."
        />

        <UAlert
          v-if="errorMessage"
          color="error"
          variant="soft"
          :title="errorMessage"
        />

        <UButton
          type="submit"
          block
          :loading="loading"
        >
          Se connecter
        </UButton>

        <p class="text-center text-sm text-muted">
          Pas encore de compte ?
          <NuxtLink
            class="text-primary font-medium"
            to="/admin/register"
          >Créer un compte</NuxtLink>
        </p>
      </UForm>
    </UCard>
  </div>
</template>
