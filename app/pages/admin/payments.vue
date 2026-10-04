<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: ['admin-auth'] })

type Payment = {
  id: string
  amount: string | number
  currency: string
  payment_method: string
  payment_status: string
  payment_date: string
  transaction_reference: string
  notes?: string | null
  persons?: { first_name: string, last_name: string } | null
}

const toast = useToast()
const payments = ref<Payment[]>([])
const loading = ref(false)
const savingId = ref<string | null>(null)
const errorMessage = ref('')
const statuses = ['en_attente', 'valide', 'echoue', 'rembourse', 'annule']

const statusLabel: Record<string, string> = {
  en_attente: 'En attente',
  valide: 'Validé',
  echoue: 'Échoué',
  rembourse: 'Remboursé',
  annule: 'Annulé'
}

const load = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    payments.value = await $fetch<Payment[]>('/api/db/records', {
      method: 'POST',
      body: {
        model: 'payments',
        action: 'findMany',
        args: {
          take: 200,
          orderBy: { payment_date: 'desc' },
          include: { persons: { select: { first_name: true, last_name: true } } }
        }
      }
    })
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.message || 'Impossible de charger les paiements.'
  } finally {
    loading.value = false
  }
}

const updateStatus = async (payment: Payment, status: string) => {
  savingId.value = payment.id
  try {
    await $fetch('/api/db/records', {
      method: 'POST',
      body: { model: 'payments', action: 'update', args: { where: { id: payment.id }, data: { payment_status: status } } }
    })
    payment.payment_status = status
    toast.add({ title: 'Statut du paiement mis à jour', color: 'success' })
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.message || 'Mise à jour impossible.'
  } finally {
    savingId.value = null
  }
}

await load()
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <UPageHeader title="Paiements" description="Suivez les règlements et testez les changements de statut." />
      <UButton class="mt-2" variant="soft" icon="i-lucide-refresh-cw" :loading="loading" @click="load()">Actualiser</UButton>
    </div>
    <UAlert v-if="errorMessage" color="error" variant="soft" :title="errorMessage" />
    <UCard>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead><tr class="border-b border-default"><th class="px-3 py-3 text-left">Date</th><th class="px-3 py-3 text-left">Licencié</th><th class="px-3 py-3 text-left">Montant</th><th class="px-3 py-3 text-left">Référence</th><th class="px-3 py-3 text-left">Méthode</th><th class="px-3 py-3 text-left">Statut</th></tr></thead>
          <tbody>
            <tr v-for="payment in payments" :key="payment.id" class="border-b border-default/60">
              <td class="px-3 py-3">{{ new Date(payment.payment_date).toLocaleDateString('fr-FR') }}</td>
              <td class="px-3 py-3 font-medium">{{ payment.persons ? `${payment.persons.first_name} ${payment.persons.last_name}` : '—' }}</td>
              <td class="px-3 py-3">{{ payment.amount }} {{ payment.currency }}</td>
              <td class="px-3 py-3 font-mono text-xs">{{ payment.transaction_reference }}</td>
              <td class="px-3 py-3">{{ payment.payment_method }}</td>
              <td class="min-w-44 px-3 py-3"><USelect :model-value="payment.payment_status" :items="statuses.map(value => ({ label: statusLabel[value], value }))" :loading="savingId === payment.id" @update:model-value="updateStatus(payment, $event)" /></td>
            </tr>
          </tbody>
        </table>
        <p v-if="!payments.length && !loading" class="py-10 text-center text-sm text-muted">Aucun paiement.</p>
      </div>
    </UCard>
  </div>
</template>
