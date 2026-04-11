<script setup lang="ts">
import { Icon } from '@iconify/vue'
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[#f8f9fa] font-['Figtree']">
    <!-- Header -->
    <header class="h-[72px] bg-white border-b border-[#f3f4f6] px-6 lg:px-10 flex items-center justify-between sticky top-0 z-50">
      <div class="flex items-center gap-3">
        <svg data-type="IMAGE" viewBox="0 0 40 40" class="w-10 h-10" data-svg-id="SVG_1">
          <g transform="matrix(1 0 0 1 0 0)">
            <g style="">
              <g transform="matrix(0.45 0 0 0.45 20 20)">
                <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(9,131,253); fill-rule: evenodd; opacity: 1;" transform=" translate(-44, -44)" d="M 44 88 C 68.3005 88 88 68.3005 88 44 C 88 19.6995 68.3005 0 44 0 C 19.6995 0 0 19.6995 0 44 C 0 68.3005 19.6995 88 44 88 Z M 44.0908 62.2576 C 25.463 77.8242 10.3639 62.7251 25.9304 44.0972 C 10.3639 25.4694 25.463 10.3702 44.0908 25.9368 C 62.715 10.3702 77.8179 25.4694 62.2513 44.0972 C 77.8179 62.7108 62.715 77.8242 44.0908 62.2576 Z M 53.2033 44.0972 C 53.2033 49.13 49.1236 53.2097 44.0908 53.2097 C 39.0582 53.2097 34.9784 49.13 34.9784 44.0972 C 34.9784 39.0645 39.0582 34.9847 44.0908 34.9847 C 49.1236 34.9847 53.2033 39.0645 53.2033 44.0972 Z" stroke-linecap="round" />
              </g>
            </g>
          </g>
        </svg>
        <span class="text-[#323743] text-2xl font-bold">Kinety</span>
      </div>
      <div class="hidden sm:block text-sm text-[#171a1f]">
        Don't have an account? 
        <a href="#" class="text-[#0983FD] font-medium hover:underline transition-brand">Register Now</a>
      </div>
      <!-- Mobile Register Link (Simplified) -->
      <div class="sm:hidden">
        <a href="#" class="text-[#0983FD] text-sm font-medium">Register</a>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-grow flex items-center justify-center p-4 lg:p-6">
      <div class="w-full max-w-[596px] bg-white rounded-[24px] shadow-[0px_8px_30px_0px_#0000000a] border border-[#f3f4f6] p-8 lg:p-[60px_60px_40px_60px] flex flex-col items-center">
        
        <!-- Illustration -->
        <div class="w-[180px] h-[180px] mb-6 overflow-hidden">
          <img src="./assets/IMG_1.png" alt="Forgot Password Illustration" class="w-full h-full object-contain" />
        </div>

        <!-- Title & Description -->
        <h1 class="text-[32px] lg:text-[40px] leading-tight font-bold text-[#323743] text-center mb-4">
          Forgot your password?
        </h1>
        <p class="text-[#636B7A] text-base leading-6 text-center mb-10 max-w-[430px]">
          Enter your email so that we can send you a password reset link
        </p>

        <!-- Form -->
        <form class="w-full space-y-6" @submit.prevent>
          <div class="flex flex-col gap-2">
            <label for="email" class="text-base font-medium text-[#424856]">Email</label>
            <div class="relative">
              <input 
                id="email"
                type="email" 
                placeholder="e.g. username@kinety.com" 
                class="w-full h-[52px] px-5 bg-white border border-[#dee1e6] rounded-[25px] text-[#171a1f] placeholder:text-[#bdc1ca] focus:border-[#0983FD] focus:ring-4 focus:ring-[#0983FD]/10 outline-none transition-brand"
              />
            </div>
          </div>

          <button 
            type="submit" 
            class="w-full h-[52px] bg-[#0983FD] hover:bg-[#0872db] text-white text-lg font-medium rounded-[26px] transition-brand shadow-sm active:scale-[0.98]"
          >
            Send Email
          </button>
        </form>

        <!-- Back to Login -->
        <button class="mt-4 h-[52px] px-6 flex items-center justify-center gap-2 text-[#171a1f] font-medium hover:bg-gray-50 rounded-[26px] transition-brand group">
          <svg data-icon="Nucleo_chevron_left_large_outlined" class="w-5 h-5 text-[#171a1f] group-hover:-translate-x-1 transition-transform" width="20" height="20" viewBox="0 0 20 20" data-svg-id="SVG_2">
            <g transform="matrix(1 0 0 1 0 0)">
              <g style="">
                <g transform="matrix(0.83 0 0 0.83 9.42 10)">
                  <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(23,26,31); fill-rule: nonzero; opacity: 1;" transform=" translate(-11.3, -12)" d="M 16.6091 4.60909 L 15 3 L 6 12 L 15 21 L 16.6091 19.3909 L 9.21818 12 L 16.6091 4.60909 Z" stroke-linecap="round" />
                </g>
              </g>
            </g>
          </svg>
          <span>Back to Login</span>
        </button>
      </div>
    </main>

    <!-- Footer -->
    <footer class="h-[54px] px-6 lg:px-10 flex items-center gap-4 text-[#9095a1] text-sm font-['Inter']">
      <span>Copyright©2023</span>
      <div class="w-[1px] h-4 bg-[#dee1e6]"></div>
      <a href="#" class="hover:text-[#323743] transition-brand">Privacy Policy</a>
    </footer>
  </div>
</template>

<style scoped>
/* Custom transitions and specific design tweaks */
.transition-brand {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Ensure the layout handles very small screens gracefully */
@media (max-width: 400px) {
  h1 {
    font-size: 24px;
  }
  .p-8 {
    padding: 1.5rem;
  }
}
</style>