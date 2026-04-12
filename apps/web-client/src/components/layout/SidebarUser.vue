<script setup lang="ts">
import { useStore } from '@nanostores/vue';
import { userStore } from '@stores/auth';

const $user = useStore(userStore);
</script>

<template>
  <!-- Loading -->
  <div v-if="$user === undefined" class="sidebar-user-info">
    <span class="skeleton skeleton-name" />
    <span class="skeleton skeleton-email" />
  </div>

  <!-- Unauthenticated -->
  <div v-else-if="$user === null" class="sidebar-user-info">
    <span class="sidebar-user-name">Guest</span>
    <span class="sidebar-user-email">Not logged in</span>
  </div>

  <!-- Authenticated -->
  <div v-else class="sidebar-user-info">
    <span class="sidebar-user-name">My Account</span>
    <span class="sidebar-user-email">{{ $user.email }}</span>
  </div>
</template>

<style scoped>
.sidebar-user-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-user-name {
  font-size: 14px;
  font-weight: 600;
  color: #171a1f;
}

.sidebar-user-email {
  font-size: 12px;
  color: #565d6d;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.skeleton {
  display: block;
  border-radius: 4px;
  background: #e5e7eb;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-name {
  width: 80px;
  height: 14px;
  margin-bottom: 4px;
}

.skeleton-email {
  width: 120px;
  height: 12px;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.4;
  }
}
</style>
