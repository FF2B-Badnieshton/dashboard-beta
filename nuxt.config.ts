// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui'],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    // Keep compatibility with the existing local deployment variable while
    // preferring the documented Nuxt runtime variable.
    sessionPassword: process.env.NUXT_SESSION_PASSWORD
      || process.env.DASHBOARD_PASSWORD
      || ''
  },
  compatibilityDate: '2026-06-30',
  nitro: {
    preset: 'netlify'
  },
  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
