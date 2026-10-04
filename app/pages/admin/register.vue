<script setup lang="ts">
definePageMeta({ layout: 'default' })

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const phoneNumber = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const loading = ref(false)
const errorMessage = ref('')

const errorText = (error: unknown) => {
  const response = error as {
    data?: { statusMessage?: string, message?: string }
    statusMessage?: string
    message?: string
  }

  return response.data?.statusMessage
    || response.data?.message
    || response.statusMessage
    || response.message
    || 'Inscription impossible.'
}

const handleRegister = async () => {
  errorMessage.value = ''

  if (password.value !== passwordConfirmation.value) {
    errorMessage.value = 'Les mots de passe ne correspondent pas.'
    return
  }

  loading.value = true

  try {
    await $fetch('/api/session/register', {
      method: 'POST',
      body: {
        first_name: firstName.value,
        last_name: lastName.value,
        email: email.value,
        phone_number: phoneNumber.value,
        password: password.value
      }
    })

    await navigateTo({ path: '/admin/login', query: { registered: '1' } })
  } catch (error) {
    errorMessage.value = errorText(error)
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
            Créer un compte
          </h1>
          <p class="text-sm text-muted">
            Inscription rapide au dashboard FF2B.
          </p>
        </div>
      </template>

      <UForm
        class="space-y-4"
        @submit.prevent="handleRegister"
      >
        <div class="grid grid-cols-2 gap-3">
          <UFormField
            label="Prénom"
            required
          >
            <UInput
              v-model="firstName"
              autocomplete="given-name"
            />
          </UFormField>
          <UFormField
            label="Nom"
            required
          >
            <UInput
              v-model="lastName"
              autocomplete="family-name"
            />
          </UFormField>
        </div>

        <UFormField
          label="Email"
          required
        >
          <UInput
            v-model="email"
            type="email"
            autocomplete="email"
          />
        </UFormField>

        <UFormField
          label="Téléphone"
          required
        >
          <UInput
            v-model="phoneNumber"
            type="tel"
            autocomplete="tel"
          />
        </UFormField>

        <UFormField
          label="Mot de passe"
          required
        >
          <UInput
            v-model="password"
            type="password"
            autocomplete="new-password"
          />
        </UFormField>

        <UFormField
          label="Confirmer le mot de passe"
          required
        >
          <UInput
            v-model="passwordConfirmation"
            type="password"
            autocomplete="new-password"
          />
        </UFormField>

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
          Créer mon compte
        </UButton>
        <p class="text-center text-sm text-muted">
          Déjà inscrit ?
          <NuxtLink
            class="text-primary font-medium"
            to="/admin/login"
          >Se connecter</NuxtLink>
        </p>
      </UForm>
    </UCard>
  </div>
</template>
