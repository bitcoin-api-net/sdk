<script setup lang="ts">
import { ref } from 'vue'


const email = ref('')
const password = ref('')
const errorMessage = ref('')

type FormStatus = 'Default' | 'Error' | 'Loading' | 'Success'
const currentStatus = ref<FormStatus>('Default')

async function handleSignUp() {
  errorMessage.value = ''
  currentStatus.value = 'Loading'

  try {
    const res = await fetch(`${import.meta.env.PUBLIC_API_URL}/v1/auth/sign-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.message || 'Something went wrong')
    }

    currentStatus.value = 'Success'
  } catch (err) {
    currentStatus.value = 'Error'
    errorMessage.value = err instanceof Error ? err.message : 'Something went wrong'
  }
}
</script>

<template>
  <form @submit.prevent="handleSignUp" class="space-y-6">
    <div class="space-y-3">
      <label class="block text-[14px] font-medium text-[#181B20]">Email</label>
      <div class="relative">
        <input v-model="email" type="email" placeholder="you@company.com" class="w-full h-11 px-3 py-2 bg-white border border-[#dee1e6] rounded-[10px] text-[14px] placeholder:text-[#8F96A3] focus:ring-2 focus:ring-[#0983FD]/10 focus:border-[#0983FD] outline-none transition-all" :class="{ 'border-red-500': currentStatus === 'Error' && errorMessage.includes('body/email') }" />
      </div>
    </div>

    <div class="space-y-3">
      <label class="block text-[14px] font-medium text-[#181B20]">Password</label>
      <input v-model="password" type="password" placeholder="••••••••" class="w-full h-11 px-3 py-2 bg-white border border-[#dee1e6] rounded-[10px] text-[14px] placeholder:text-[#8F96A3] focus:ring-2 focus:ring-[#0983FD]/10 focus:border-[#0983FD] outline-none transition-all" :class="{ 'border-red-500': currentStatus === 'Error' && errorMessage.includes('body/password') }" />
    </div>

    <p v-if="currentStatus === 'Error'" class="text-sm text-red-500">{{ errorMessage }}</p>

    <p v-if="currentStatus === 'Success'" class="text-sm text-green-600">
      Check your email for a verification link.
    </p>

    <button class="w-full h-11 bg-[#0983FD] hover:bg-[#0872db] text-white font-medium rounded-[10px] shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70" :disabled="currentStatus === 'Loading' || currentStatus === 'Success'">
      <svg v-if="currentStatus === 'Loading'" class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <svg v-if="currentStatus === 'Success'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      <span>
        {{
          currentStatus === 'Loading' ? 'Creating account...' :
            currentStatus === 'Success' ? 'Check your email!' :
              'Create account'
        }}
      </span>
    </button>
  </form>
</template>

<style scoped>
input:focus {
  outline: none;
  border-color: #0983FD;
  box-shadow: 0 0 0 4px rgba(9, 131, 253, 0.1);
}
</style>
