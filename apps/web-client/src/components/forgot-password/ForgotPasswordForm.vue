<script setup lang="ts">
import { ref } from 'vue'

const email = ref('')
</script>

<template>
  <form @submit.prevent class="w-full space-y-6">
    <div class="flex flex-col gap-2">
      <label for="email" class="text-base font-medium text-[#424856]">Email</label>
      <input
        id="email"
        v-model="email"
        type="email"
        placeholder="e.g. username@kinety.com"
        class="w-full h-[52px] px-5 bg-white border border-[#dee1e6] rounded-[25px] text-[#171a1f] placeholder:text-[#bdc1ca] focus:border-[#0983FD] focus:ring-4 focus:ring-[#0983FD]/10 outline-none transition-brand"
      />
    </div>

    <button
      type="submit"
      class="w-full h-[52px] bg-[#0983FD] hover:bg-[#0872db] text-white text-lg font-medium rounded-[26px] transition-brand shadow-sm active:scale-[0.98]"
    >
      Send Email
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
