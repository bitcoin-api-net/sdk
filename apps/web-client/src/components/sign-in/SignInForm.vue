<script setup lang="ts">
import { ref } from 'vue'

const API_URL = import.meta.env.VITE_API_BROWSER_URL

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const showPassword = ref(false)
const errorMessage = ref('')

type FormStatus = 'Default' | 'Error' | 'Loading'
const currentStatus = ref<FormStatus>('Default')

async function handleSignIn() {
  errorMessage.value = ''
  currentStatus.value = 'Loading'

  try {
    const res = await fetch(`${API_URL}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: email.value, password: password.value }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.message || 'Something went wrong')
    }

    window.location.href = '/'
  } catch (err) {
    currentStatus.value = 'Error'
    errorMessage.value = err instanceof Error ? err.message : 'Something went wrong'
  }
}
</script>

<template>
  <form @submit.prevent="handleSignIn" class="space-y-6">
    <div>
      <label class="block text-sm font-medium mb-2">Email address</label>
      <input
        v-model="email"
        type="email"
        class="w-full h-11 px-3 bg-white border border-[#dee1e6] rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-[#2563eb] outline-none transition-all"
      />
    </div>

    <div class="relative">
      <div class="flex items-center justify-between mb-2">
        <label class="text-sm font-medium">Password</label>
        <a href="#" class="text-sm font-medium text-[#2563EB] hover:underline">Forgot password?</a>
      </div>
      <div class="relative">
        <input
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          placeholder="••••••••"
          class="w-full h-11 px-3 pr-10 bg-white border border-[#dee1e6] rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-[#2563eb] outline-none transition-all placeholder:text-[#8F96A3]"
        />
        <button
          type="button"
          @click="showPassword = !showPassword"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F96A3] hover:text-[#323843]"
        >
          <svg class="w-4 h-4" viewBox="0 0 16 16">
            <g transform="matrix(1 0 0 1 0 0)"><g>
              <g transform="matrix(0.67 0 0 0.67 8 8)">
                <path style="stroke: none; fill: rgb(143,150,163); fill-rule: nonzero; opacity: 1;" transform=" translate(-12, -12)" d="M 12.0005 4.00061 C 14.3273 4.0007 16.6019 4.69176 18.5356 5.98596 C 20.3484 7.1993 21.7854 8.89154 22.6889 10.8707 L 22.8628 11.2711 L 22.8755 11.3043 C 23.0213 11.6972 23.0396 12.1245 22.9302 12.526 L 22.8755 12.6959 C 22.8714 12.707 22.8673 12.7182 22.8628 12.7291 C 21.9756 14.8803 20.4694 16.72 18.5356 18.0143 C 16.7228 19.2276 14.6102 19.9101 12.436 19.9908 L 12.0005 19.9996 C 9.67347 19.9996 7.39818 19.3086 5.46434 18.0143 C 3.65131 16.8008 2.21456 15.108 1.31102 13.1285 L 1.13719 12.7291 C 1.13268 12.7182 1.12861 12.707 1.12449 12.6959 C 0.957874 12.247 0.95793 11.7533 1.12449 11.3043 L 1.13719 11.2711 C 2.02437 9.11997 3.5306 7.28025 5.46434 5.98596 C 7.39818 4.69167 9.67347 4.00061 12.0005 4.00061 Z M 12.0005 6.00061 C 10.0696 6.00061 8.18132 6.57408 6.57664 7.64807 C 4.9822 8.71529 3.7384 10.2291 3.00047 11.9996 C 3.73839 13.7704 4.98196 15.2848 6.57664 16.3522 C 8.18132 17.4262 10.0696 17.9996 12.0005 17.9996 L 12.3618 17.9928 C 14.1659 17.9258 15.919 17.359 17.4233 16.3522 C 19.0179 15.2849 20.2606 13.7703 20.9985 11.9996 C 20.2606 10.2293 19.0177 8.71522 17.4233 7.64807 C 15.8188 6.57417 13.9312 6.0007 12.0005 6.00061 Z" stroke-linecap="round" />
              </g>
              <g transform="matrix(0.67 0 0 0.67 8 8)">
                <path style="stroke: none; fill: rgb(143,150,163); fill-rule: nonzero; opacity: 1;" transform=" translate(-12, -12)" d="M 14 12 C 14 10.8954 13.1046 10 12 10 C 10.8954 10 10 10.8954 10 12 C 10 13.1046 10.8954 14 12 14 C 13.1046 14 14 13.1046 14 12 Z M 16 12 C 16 14.2091 14.2091 16 12 16 C 9.79086 16 8 14.2091 8 12 C 8 9.79086 9.79086 8 12 8 C 14.2091 8 16 9.79086 16 12 Z" stroke-linecap="round" />
              </g>
            </g></g>
          </svg>
        </button>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <div class="relative flex items-center">
        <input
          v-model="rememberMe"
          type="checkbox"
          id="remember"
          class="custom-checkbox"
        />
      </div>
      <label for="remember" class="text-sm text-[#8F96A3] cursor-pointer">Remember me for 30 days</label>
    </div>

    <p v-if="currentStatus === 'Error'" class="text-sm text-red-500">{{ errorMessage }}</p>

    <button
      type="submit"
      class="w-full h-11 bg-[#2563EB] text-white rounded-xl text-sm font-medium shadow-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
      :disabled="currentStatus === 'Loading'"
    >
      <svg v-if="currentStatus === 'Loading'" class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <span>{{ currentStatus === 'Loading' ? 'Signing in...' : 'Sign in' }}</span>
    </button>
  </form>
</template>

<style scoped>
input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
}

.custom-checkbox {
  appearance: none;
  background-color: #fff;
  margin: 0;
  font: inherit;
  color: currentColor;
  width: 16px;
  height: 16px;
  border: 1px solid #565d6d;
  border-radius: 2px;
  display: grid;
  place-content: center;
  cursor: pointer;
}

.custom-checkbox::before {
  content: "";
  width: 10px;
  height: 10px;
  transform: scale(0);
  transition: 120ms transform ease-in-out;
  box-shadow: inset 1em 1em #2563EB;
  clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
}

.custom-checkbox:checked::before {
  transform: scale(1);
}
</style>
