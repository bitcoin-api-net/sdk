<script setup lang="ts">
import { ref } from 'vue'

const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')

type FormStatus = 'Default' | 'Loading' | 'Success' | 'Error'
const currentStatus = ref<FormStatus>('Default')

function getToken(): string {
  const params = new URLSearchParams(window.location.search)
  return params.get('token') ?? ''
}

async function handleResetPassword() {
  errorMessage.value = ''

  if (password.value !== confirmPassword.value) {
    currentStatus.value = 'Error'
    errorMessage.value = 'Passwords do not match'
    return
  }

  if (password.value.length < 8) {
    currentStatus.value = 'Error'
    errorMessage.value = 'Password must be at least 8 characters'
    return
  }

  currentStatus.value = 'Loading'

  try {
    const res = await fetch(`${import.meta.env.PUBLIC_API_URL}/v1/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: getToken(), password: password.value }),
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
  <div v-if="currentStatus === 'Success'" class="w-full text-center space-y-4">
    <div class="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
      <svg class="w-8 h-8 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </div>
    <p class="text-[#323743] text-lg font-medium">Password reset successful</p>
    <p class="text-[#636B7A] text-base">You can now sign in with your new password.</p>
    <a
      href="/authorization/sign-in"
      class="inline-block h-[52px] px-8 bg-[#0983FD] hover:bg-[#0872db] text-white text-lg font-medium rounded-[26px] transition-brand shadow-sm active:scale-[0.98] leading-[52px]"
    >
      Sign In
    </a>
  </div>

  <form v-else @submit.prevent="handleResetPassword" class="w-full space-y-6">
    <div class="flex flex-col gap-2">
      <label for="password" class="text-base font-medium text-[#424856]">New Password</label>
      <input
        id="password"
        v-model="password"
        type="password"
        required
        minlength="8"
        placeholder="At least 8 characters"
        class="w-full h-[52px] px-5 bg-white border border-[#dee1e6] rounded-[25px] text-[#171a1f] placeholder:text-[#bdc1ca] focus:border-[#0983FD] focus:ring-4 focus:ring-[#0983FD]/10 outline-none transition-brand"
      />
    </div>

    <div class="flex flex-col gap-2">
      <label for="confirmPassword" class="text-base font-medium text-[#424856]">Confirm Password</label>
      <input
        id="confirmPassword"
        v-model="confirmPassword"
        type="password"
        required
        minlength="8"
        placeholder="Repeat your password"
        class="w-full h-[52px] px-5 bg-white border border-[#dee1e6] rounded-[25px] text-[#171a1f] placeholder:text-[#bdc1ca] focus:border-[#0983FD] focus:ring-4 focus:ring-[#0983FD]/10 outline-none transition-brand"
      />
    </div>

    <p v-if="currentStatus === 'Error'" class="text-sm text-red-500">{{ errorMessage }}</p>

    <button
      type="submit"
      class="w-full h-[52px] bg-[#0983FD] hover:bg-[#0872db] text-white text-lg font-medium rounded-[26px] transition-brand shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
      :disabled="currentStatus === 'Loading'"
    >
      <svg v-if="currentStatus === 'Loading'" class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <span>{{ currentStatus === 'Loading' ? 'Resetting...' : 'Reset Password' }}</span>
    </button>
  </form>
</template>

<style scoped>
.transition-brand {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

input:focus {
  outline: none;
  border-color: #0983FD;
  box-shadow: 0 0 0 4px rgba(9, 131, 253, 0.1);
}
</style>
