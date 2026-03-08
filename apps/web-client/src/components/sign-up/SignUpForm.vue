<script setup lang="ts">
import { ref } from 'vue'

const email = ref('')
const password = ref('')

type FormStatus = 'Default' | 'Error' | 'Loading' | 'Success'
const currentStatus = ref<FormStatus>('Default')
</script>

<template>
  <form @submit.prevent class="space-y-6">
    <div class="space-y-3">
      <label class="block text-[14px] font-medium text-[#181B20]">Email</label>
      <div class="relative">
        <input
          v-model="email"
          type="email"
          placeholder="you@company.com"
          class="w-full h-11 px-3 py-2 bg-white border border-[#dee1e6] rounded-[10px] text-[14px] placeholder:text-[#8F96A3] focus:ring-2 focus:ring-[#0983FD]/10 focus:border-[#0983FD] outline-none transition-all"
          :class="{ 'border-red-500': currentStatus === 'Error' }"
        />
        <p v-if="currentStatus === 'Error'" class="text-xs text-red-500 mt-1">Please enter a valid email address.</p>
      </div>
    </div>

    <div class="space-y-3">
      <label class="block text-[14px] font-medium text-[#181B20]">Password</label>
      <input
        v-model="password"
        type="password"
        placeholder="••••••••"
        class="w-full h-11 px-3 py-2 bg-white border border-[#dee1e6] rounded-[10px] text-[14px] placeholder:text-[#8F96A3] focus:ring-2 focus:ring-[#0983FD]/10 focus:border-[#0983FD] outline-none transition-all"
      />
    </div>

    <button
      class="w-full h-11 bg-[#0983FD] hover:bg-[#0872db] text-white font-medium rounded-[10px] shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70"
      :disabled="currentStatus === 'Loading'"
    >
      <!-- Loader spinner -->
      <svg v-if="currentStatus === 'Loading'" class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <!-- Success check -->
      <svg v-if="currentStatus === 'Success'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      <span>
        {{
          currentStatus === 'Loading' ? 'Creating account...' :
          currentStatus === 'Success' ? 'Account Created!' :
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
