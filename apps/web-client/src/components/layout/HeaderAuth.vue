<script setup lang="ts">
import { useStore } from '@nanostores/vue';
import { userStore } from '@stores/auth';

const props = withDefaults(defineProps<{ variant?: 'header' | 'sidebar' }>(), {
  variant: 'header',
});

const $user = useStore(userStore);
</script>

<template>
  <!-- ── Sidebar variant ── -->
  <template v-if="variant === 'sidebar'">
    <template v-if="$user">
      <a href="/profile/home" class="sidebar-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="10" r="3" />
          <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
        </svg>
        <span>Profile</span>
      </a>
    </template>
    <template v-else>
      <a href="/authorization/sign-in" class="sidebar-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
        <span>Log in</span>
      </a>
      <a href="/authorization/sign-up" class="sidebar-link sidebar-link--primary">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
        <span>Get started</span>
      </a>
    </template>
  </template>

  <!-- ── Header variant (default) ── -->
  <div v-else class="flex items-center gap-4">
    <template v-if="!$user">
      <a href="/authorization/sign-in" class="text-sm font-medium text-[#565d6d] hover:text-[#0983FD] transition-colors">
        Log in
      </a>
      <a href="/authorization/sign-up" class="text-sm font-medium text-white bg-[#0983FD] px-5 py-2 rounded-md hover:bg-[#076ed4] transition-colors shadow-sm">
        Get started
      </a>
    </template>

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

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #565d6d;
  border-radius: 0.5rem;
  text-decoration: none;
  transition: background-color 0.15s, color 0.15s;
}

.sidebar-link:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: #0983FD;
}

.sidebar-link--primary {
  background-color: #0983FD;
  color: white;
}

.sidebar-link--primary:hover {
  background-color: #076ed4;
  color: white;
}
</style>
