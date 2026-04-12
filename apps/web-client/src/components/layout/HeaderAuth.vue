<script setup lang="ts">
import { useStore } from '@nanostores/vue';
import { userStore } from '@stores/auth';

const $user = useStore(userStore);
</script>

<template>
  <div class="flex items-center gap-4">
    <!-- Unauthenticated -->
    <template v-if="!$user">
      <a href="/authorization/sign-in" class="text-sm font-medium text-[#565d6d] hover:text-[#0983FD] transition-colors">
        Log in
      </a>
      <a href="/authorization/sign-up" class="text-sm font-medium text-white bg-[#0983FD] px-5 py-2 rounded-md hover:bg-[#076ed4] transition-colors shadow-sm">
        Get started
      </a>
    </template>

    <!-- Authenticated -->
    <a v-else href="/profile/home" class="profile-icon-link" aria-label="Profile">
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#565d6d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="10" r="3" />
        <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
      </svg>
    </a>
  </div>
</template>

<style scoped>
.profile-icon-link {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  padding: 4px;
  transition: background-color 0.2s;
}

.profile-icon-link:hover {
  background-color: #f0f2f5;
}
</style>
