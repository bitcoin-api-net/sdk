<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'

const email = ref('developer@example.com')
const password = ref('')
const rememberMe = ref(false)
const showPassword = ref(false)

const footerLinks = [
  {
    title: 'Product',
    links: ['Core API', 'Lightning Network', 'Webhooks', 'Pricing']
  },
  {
    title: 'Resources',
    links: ['Documentation', 'API Reference', 'Guides', 'Status']
  },
  {
    title: 'Company',
    links: ['About Us', 'Blog', 'Careers', 'Contact']
  },
  {
    title: 'Legal',
    links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy']
  }
]
</script>

<template>
  <div class="min-h-screen bg-white font-['Inter'] text-[#323843]">
    <!-- Header -->
    <header class="sticky top-0 z-50 w-full bg-white/60 backdrop-blur-md border-b border-[#f3f4f6]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-[#2563EB] rounded-xl flex items-center justify-center shadow-sm">
            <svg data-svg-id="SVG_1" class="w-5 h-5 text-white" viewBox="0 0 20 20">
              <g transform="matrix(1 0 0 1 0 0)">
                <g style="">
                  <g transform="matrix(0.83 0 0 0.83 9.67 9.87)">
                    <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(255,255,255); fill-rule: nonzero; opacity: 1;" transform=" translate(-11.6, -11.85)" d="M 9.64417 2.36352 C 9.78218 1.87583 10.27 1.56267 10.7799 1.65258 C 11.3236 1.74864 11.6864 2.267 11.5905 2.81079 L 11.4166 3.79614 L 13.3864 4.14379 L 13.5612 3.15844 C 13.6572 2.61458 14.1765 2.25085 14.7203 2.34692 C 15.264 2.44315 15.6269 2.96235 15.5309 3.5061 L 15.3414 4.57446 C 16.3357 4.93464 17.1006 5.54442 17.6119 6.31372 C 18.2686 7.30173 18.4625 8.48276 18.2701 9.57348 C 18.0778 10.6642 17.4917 11.7075 16.5368 12.4114 C 16.3756 12.5301 16.2048 12.6359 16.027 12.7317 C 16.1612 12.8825 16.2854 13.0406 16.3961 13.2073 C 17.0525 14.1953 17.2448 15.3764 17.0524 16.467 C 16.86 17.5577 16.2748 18.6011 15.32 19.3049 C 14.5768 19.8527 13.6502 20.1635 12.5934 20.1623 L 12.4059 21.2317 L 12.3834 21.3313 C 12.246 21.8194 11.7578 22.1338 11.2477 22.0442 C 10.7039 21.9485 10.3406 21.4299 10.4362 20.886 L 10.609 19.8997 L 8.63734 19.552 L 8.46449 20.5373 L 7.48011 20.3635 L 6.49476 20.1907 L 6.66859 19.2043 L 5.68616 19.0315 L 5.58656 19.009 C 5.09881 18.871 4.78567 18.3832 4.87562 17.8733 C 4.97157 17.3294 5.48994 16.9658 6.03382 17.0618 L 7.01527 17.2346 L 9.09925 5.41723 L 8.11585 5.24438 L 8.01624 5.22192 C 7.5287 5.08381 7.21541 4.59598 7.30531 4.08618 C 7.39527 3.57638 7.85654 3.22585 8.36195 3.26293 L 8.46351 3.27563 L 9.44593 3.44848 L 9.62074 2.46313 L 9.64417 2.36352 Z M 8.46449 20.5373 C 8.36857 21.0812 7.85018 21.4448 7.30628 21.3489 C 6.76255 21.253 6.39912 20.7344 6.49476 20.1907 L 8.46449 20.5373 Z M 8.98499 17.5823 L 11.941 18.1038 L 12.1227 18.1321 C 13.0159 18.2496 13.6745 18.0338 14.1334 17.6956 C 14.6376 17.324 14.972 16.752 15.0836 16.1194 C 15.1951 15.4868 15.0766 14.8353 14.7301 14.3137 C 14.4146 13.839 13.8694 13.4112 12.9899 13.2161 L 12.8092 13.1799 L 12.8063 13.179 L 9.85316 12.6584 L 8.98499 17.5823 Z M 10.2008 10.6887 L 13.1578 11.2102 L 13.3395 11.2385 C 14.2328 11.3563 14.8914 11.1401 15.3502 10.802 C 15.8543 10.4305 16.1889 9.85846 16.3004 9.22583 C 16.4118 8.59347 16.2933 7.94252 15.9469 7.42114 C 15.6104 6.91477 15.0126 6.46036 14.026 6.28637 L 14.0241 6.28637 C 14.0227 6.28614 14.0215 6.28563 14.0201 6.2854 L 11.069 5.76489 L 10.2008 10.6887 Z" stroke-linecap="round" />
                  </g>
                </g>
              </g>
            </svg>
          </div>
          <span class="text-lg font-semibold tracking-tight">Bitcoin API</span>
        </div>

        <!-- Desktop Navigation -->
        <nav class="hidden md:flex items-center gap-8">
          <a href="#" class="text-sm font-medium text-[#8F96A3] hover:text-[#323843] transition-colors">Products</a>
          <a href="#" class="text-sm font-medium text-[#8F96A3] hover:text-[#323843] transition-colors">Docs</a>
          <a href="#" class="text-sm font-medium text-[#8F96A3] hover:text-[#323843] transition-colors">Pricing</a>
        </nav>

        <div class="flex items-center gap-6">
          <a href="#" class="hidden sm:block text-sm font-medium text-[#8F96A3] hover:text-[#323843] transition-colors">Log in</a>
          <button class="bg-[#2563EB] text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm hover:bg-blue-700 transition-colors">
            Get API Key
          </button>
          <!-- Mobile Menu Toggle (Simplified) -->
          <button class="md:hidden text-[#8F96A3]">
            <Icon icon="lucide:menu" class="w-6 h-6" />
          </button>
        </div>
      </div>
    </header>

    <main class="flex flex-col items-center px-4 pt-16 pb-24">
      <!-- Title Section -->
      <div class="text-center mb-10">
        <h1 class="text-[30px] font-semibold font-['Sora'] tracking-tight mb-2">Sign in to your account</h1>
        <p class="text-[#8F96A3] text-base">Welcome back to Bitcoin API</p>
      </div>

      <!-- Auth Card -->
      <div class="w-full max-w-[440px] bg-white rounded-[14px] p-8 auth-card">
        <!-- Social Login -->
        <button class="w-full h-11 flex items-center justify-center gap-3 border border-[#f3f4f6] rounded-xl hover:bg-gray-50 transition-colors mb-6">
          <svg data-svg-id="SVG_2" class="w-5 h-5" viewBox="0 0 20 20">
              <g transform="matrix(1 0 0 1 0 0)">
                <g style="">
                  <g transform="matrix(1 0 0 1 10 10)">
                    <g style="">
                      <g transform="matrix(0.83 0 0 0.83 4.4 2.64)">
                        <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(66,133,244); fill-rule: nonzero; opacity: 1;" transform=" translate(-17.28, -15.17)" d="M 22.56 12.25 C 22.56 11.47 22.49 10.72 22.36 10 L 12 10 L 12 14.26 L 17.92 14.26 C 17.66 15.629999999999999 16.880000000000003 16.79 15.71 17.57 L 15.71 20.34 L 19.28 20.34 C 21.36 18.42 22.560000000000002 15.6 22.560000000000002 12.25 z" stroke-linecap="round" />
                      </g>
                      <g transform="matrix(0.83 0 0 0.83 -1.06 5.46)">
                        <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(52,168,83); fill-rule: nonzero; opacity: 1;" transform=" translate(-10.73, -18.55)" d="M 12 23 C 14.97 23 17.46 22.02 19.28 20.34 L 15.71 17.57 C 14.73 18.23 13.48 18.63 12 18.63 C 9.14 18.63 6.71 16.7 5.84 14.099999999999998 L 2.18 14.099999999999998 L 2.18 16.939999999999998 C 3.99 20.53 7.7 23 12 23 z" stroke-linecap="round" />
                      </g>
                      <g transform="matrix(0.83 0 0 0.83 -7.15 0)">
                        <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(251,188,5); fill-rule: nonzero; opacity: 1;" transform=" translate(-3.42, -12)" d="M 5.84 14.09 C 5.62 13.43 5.49 12.73 5.49 12 C 5.49 11.27 5.62 10.57 5.84 9.91 L 5.84 7.07 L 2.18 7.07 C 1.43 8.55 1 10.22 1 12 C 1 13.78 1.43 15.45 2.1799999999999997 16.93 L 5.029999999999999 14.709999999999999 L 5.84 14.09 z" stroke-linecap="round" />
                      </g>
                      <g transform="matrix(0.83 0 0 0.83 -1.03 -5.45)">
                        <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(234,67,53); fill-rule: nonzero; opacity: 1;" transform=" translate(-10.77, -5.46)" d="M 12 5.38 C 13.620000000000001 5.38 15.06 5.9399999999999995 16.21 7.02 L 19.36 3.8699999999999997 C 17.45 2.09 14.97 1 12 1 C 7.7 1 3.99 3.47 2.18 7.07 L 5.84 9.91 C 6.71 7.3100000000000005 9.14 5.38 12 5.38 z" stroke-linecap="round" />
                      </g>
                    </g>
                  </g>
                </g>
              </g>
            </svg>
          <span class="text-sm font-medium">Continue with Google</span>
        </button>

        <!-- Divider -->
        <div class="text-divider mb-8">
          OR CONTINUE WITH EMAIL
        </div>

        <!-- Form -->
        <form @submit.prevent class="space-y-6">
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
                <svg data-svg-id="SVG_3" class="w-4 h-4" viewBox="0 0 16 16">
            <g transform="matrix(1 0 0 1 0 0)">
              <g style="">
                <g transform="matrix(0.67 0 0 0.67 8 8)">
                  <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(143,150,163); fill-rule: nonzero; opacity: 1;" transform=" translate(-12, -12)" d="M 12.0005 4.00061 C 14.3273 4.0007 16.6019 4.69176 18.5356 5.98596 C 20.3484 7.1993 21.7854 8.89154 22.6889 10.8707 L 22.8628 11.2711 L 22.8755 11.3043 C 23.0213 11.6972 23.0396 12.1245 22.9302 12.526 L 22.8755 12.6959 C 22.8714 12.707 22.8673 12.7182 22.8628 12.7291 C 21.9756 14.8803 20.4694 16.72 18.5356 18.0143 C 16.7228 19.2276 14.6102 19.9101 12.436 19.9908 L 12.0005 19.9996 C 9.67347 19.9996 7.39818 19.3086 5.46434 18.0143 C 3.65131 16.8008 2.21456 15.108 1.31102 13.1285 L 1.13719 12.7291 C 1.13268 12.7182 1.12861 12.707 1.12449 12.6959 C 0.957874 12.247 0.95793 11.7533 1.12449 11.3043 L 1.13719 11.2711 C 2.02437 9.11997 3.5306 7.28025 5.46434 5.98596 C 7.39818 4.69167 9.67347 4.00061 12.0005 4.00061 Z M 12.0005 6.00061 C 10.0696 6.00061 8.18132 6.57408 6.57664 7.64807 C 4.9822 8.71529 3.7384 10.2291 3.00047 11.9996 C 3.73839 13.7704 4.98196 15.2848 6.57664 16.3522 C 8.18132 17.4262 10.0696 17.9996 12.0005 17.9996 L 12.3618 17.9928 C 14.1659 17.9258 15.919 17.359 17.4233 16.3522 C 19.0179 15.2849 20.2606 13.7703 20.9985 11.9996 C 20.2606 10.2293 19.0177 8.71522 17.4233 7.64807 C 15.8188 6.57417 13.9312 6.0007 12.0005 6.00061 Z" stroke-linecap="round" />
                </g>
                <g transform="matrix(0.67 0 0 0.67 8 8)">
                  <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(143,150,163); fill-rule: nonzero; opacity: 1;" transform=" translate(-12, -12)" d="M 14 12 C 14 10.8954 13.1046 10 12 10 C 10.8954 10 10 10.8954 10 12 C 10 13.1046 10.8954 14 12 14 C 13.1046 14 14 13.1046 14 12 Z M 16 12 C 16 14.2091 14.2091 16 12 16 C 9.79086 16 8 14.2091 8 12 C 8 9.79086 9.79086 8 12 8 C 14.2091 8 16 9.79086 16 12 Z" stroke-linecap="round" />
                </g>
              </g>
            </g>
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
                class="w-4 h-4 rounded border-[#565d6d] text-[#2563EB] focus:ring-[#2563EB]"
              />
            </div>
            <label for="remember" class="text-sm text-[#8F96A3] cursor-pointer">Remember me for 30 days</label>
          </div>

          <button type="submit" class="w-full h-11 bg-[#2563EB] text-white rounded-xl text-sm font-medium shadow-sm hover:bg-blue-700 transition-colors">
            Sign in
          </button>
        </form>
      </div>

      <!-- Bottom Link -->
      <p class="mt-8 text-sm text-[#8F96A3]">
        Don't have an account? 
        <a href="#" class="text-[#2563EB] font-medium hover:underline">Create account</a>
      </p>
    </main>

    <!-- Footer -->
    <footer class="bg-[#F9FAFB] border-t border-[#f3f4f6] pt-16 pb-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-16">
          <!-- Brand Column -->
          <div class="lg:col-span-2">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-8 h-8 bg-[#2563EB] rounded-xl flex items-center justify-center shadow-sm">
                <svg data-svg-id="SVG_4" class="w-5 h-5 text-white" viewBox="0 0 20 20">
              <g transform="matrix(1 0 0 1 0 0)">
                <g style="">
                  <g transform="matrix(0.83 0 0 0.83 9.67 9.87)">
                    <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(255,255,255); fill-rule: nonzero; opacity: 1;" transform=" translate(-11.6, -11.85)" d="M 9.64417 2.36352 C 9.78218 1.87583 10.27 1.56267 10.7799 1.65258 C 11.3236 1.74864 11.6864 2.267 11.5905 2.81079 L 11.4166 3.79614 L 13.3864 4.14379 L 13.5612 3.15844 C 13.6572 2.61458 14.1765 2.25085 14.7203 2.34692 C 15.264 2.44315 15.6269 2.96235 15.5309 3.5061 L 15.3414 4.57446 C 16.3357 4.93464 17.1006 5.54442 17.6119 6.31372 C 18.2686 7.30173 18.4625 8.48276 18.2701 9.57348 C 18.0778 10.6642 17.4917 11.7075 16.5368 12.4114 C 16.3756 12.5301 16.2048 12.6359 16.027 12.7317 C 16.1612 12.8825 16.2854 13.0406 16.3961 13.2073 C 17.0525 14.1953 17.2448 15.3764 17.0524 16.467 C 16.86 17.5577 16.2748 18.6011 15.32 19.3049 C 14.5768 19.8527 13.6502 20.1635 12.5934 20.1623 L 12.4059 21.2317 L 12.3834 21.3313 C 12.246 21.8194 11.7578 22.1338 11.2477 22.0442 C 10.7039 21.9485 10.3406 21.4299 10.4362 20.886 L 10.609 19.8997 L 8.63734 19.552 L 8.46449 20.5373 L 7.48011 20.3635 L 6.49476 20.1907 L 6.66859 19.2043 L 5.68616 19.0315 L 5.58656 19.009 C 5.09881 18.871 4.78567 18.3832 4.87562 17.8733 C 4.97157 17.3294 5.48994 16.9658 6.03382 17.0618 L 7.01527 17.2346 L 9.09925 5.41723 L 8.11585 5.24438 L 8.01624 5.22192 C 7.5287 5.08381 7.21541 4.59598 7.30531 4.08618 C 7.39527 3.57638 7.85654 3.22585 8.36195 3.26293 L 8.46351 3.27563 L 9.44593 3.44848 L 9.62074 2.46313 L 9.64417 2.36352 Z M 8.46449 20.5373 C 8.36857 21.0812 7.85018 21.4448 7.30628 21.3489 C 6.76255 21.253 6.39912 20.7344 6.49476 20.1907 L 8.46449 20.5373 Z M 8.98499 17.5823 L 11.941 18.1038 L 12.1227 18.1321 C 13.0159 18.2496 13.6745 18.0338 14.1334 17.6956 C 14.6376 17.324 14.972 16.752 15.0836 16.1194 C 15.1951 15.4868 15.0766 14.8353 14.7301 14.3137 C 14.4146 13.839 13.8694 13.4112 12.9899 13.2161 L 12.8092 13.1799 L 12.8063 13.179 L 9.85316 12.6584 L 8.98499 17.5823 Z M 10.2008 10.6887 L 13.1578 11.2102 L 13.3395 11.2385 C 14.2328 11.3563 14.8914 11.1401 15.3502 10.802 C 15.8543 10.4305 16.1889 9.85846 16.3004 9.22583 C 16.4118 8.59347 16.2933 7.94252 15.9469 7.42114 C 15.6104 6.91477 15.0126 6.46036 14.026 6.28637 L 14.0241 6.28637 C 14.0227 6.28614 14.0215 6.28563 14.0201 6.2854 L 11.069 5.76489 L 10.2008 10.6887 Z" stroke-linecap="round" />
                  </g>
                </g>
              </g>
            </svg>
              </div>
              <span class="text-xl font-semibold font-['Sora'] tracking-tight">Bitcoin API</span>
            </div>
            <p class="text-[#8F96A3] text-sm leading-relaxed max-w-xs mb-8">
              The most reliable and scalable Bitcoin infrastructure for modern applications and developers.
            </p>
            <div class="flex items-center gap-5">
              <a href="#" class="text-[#8F96A3] hover:text-[#2563EB] transition-colors">
                <svg data-svg-id="SVG_5" class="w-5 h-5" viewBox="0 0 20 20">
          <g transform="matrix(1 0 0 1 0 0)">
            <g style="">
              <g transform="matrix(0.83 0 0 0.83 10 10.42)">
                <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(143,150,163); fill-rule: nonzero; opacity: 1;" transform=" translate(-12, -12.5)" d="M 13.5752 3.58785 C 15.2923 2.69324 17.5324 2.74899 19.3115 4.15133 C 19.3985 4.13033 19.4992 4.10363 19.6123 4.06539 C 19.8904 3.9714 20.1894 3.84084 20.4727 3.70211 C 20.7535 3.56459 21.0049 3.42587 21.1865 3.32125 C 21.2769 3.26919 21.349 3.22562 21.3975 3.19625 C 21.4217 3.18158 21.4405 3.17025 21.4522 3.16305 C 21.4577 3.15961 21.4615 3.15671 21.4639 3.15524 L 21.4658 3.15524 L 21.4668 3.15426 L 21.4658 3.15426 C 21.8232 2.92856 22.2845 2.95217 22.6172 3.21285 C 22.908 3.4409 23.0457 3.8075 22.9863 4.16403 L 22.9483 4.31637 L 22.9483 4.31832 L 22.9473 4.32028 C 22.9466 4.32223 22.9454 4.32513 22.9443 4.32809 C 22.9423 4.33397 22.9399 4.34187 22.9365 4.35153 C 22.9297 4.37112 22.9205 4.39847 22.9082 4.43258 C 22.8835 4.50106 22.8468 4.59812 22.7998 4.71676 C 22.7062 4.95344 22.5673 5.28148 22.3848 5.65328 C 22.0839 6.26615 21.6401 7.04085 21.0547 7.72555 C 22.3445 18.1499 11.0183 25.6897 1.88771 20.1132 L 1.44728 19.8339 C 1.07254 19.5856 0.910374 19.1168 1.04982 18.6894 C 1.18937 18.2624 1.59619 17.9808 2.04494 18.0009 C 3.40575 18.0628 4.75243 17.7802 5.91212 17.2002 C 1.55099 14.7939 -0.367632 9.10181 2.12111 4.52242 L 2.18654 4.41793 C 2.35225 4.18629 2.61124 4.03431 2.89845 4.00485 C 3.22665 3.97135 3.55058 4.1026 3.76369 4.35446 C 5.53242 6.44456 8.16475 7.75816 10.8916 7.97262 C 10.9026 5.97977 12.0241 4.39605 13.5752 3.58785 Z M 18.3174 5.93063 C 17.1474 4.83889 15.6363 4.77035 14.5 5.36227 C 13.3853 5.94302 12.6281 7.15838 12.9776 8.79 C 13.0397 9.0802 12.9702 9.38361 12.7871 9.61715 C 12.6039 9.85072 12.326 9.99124 12.0293 9.99996 C 8.85378 10.0933 5.68513 8.90712 3.334 6.77828 C 2.17413 10.5587 4.34448 14.859 8.28712 16.042 C 8.63564 16.1465 8.90039 16.4325 8.97755 16.788 C 9.04502 17.0992 8.95977 17.4211 8.75392 17.6572 L 8.65822 17.7529 C 7.727 18.5676 6.62472 19.1646 5.44435 19.54 C 12.655 21.7442 20.3027 15.6202 19.0127 7.55758 C 18.9622 7.24115 19.0665 6.91997 19.293 6.69332 C 19.4748 6.51154 19.6439 6.30513 19.8027 6.08883 C 19.5438 6.15261 19.2703 6.20016 19 6.20016 C 18.7467 6.20016 18.5026 6.10345 18.3174 5.93063 Z" stroke-linecap="round" />
              </g>
            </g>
          </g>
        </svg>
              </a>
              <a href="#" class="text-[#8F96A3] hover:text-[#2563EB] transition-colors">
                <svg data-svg-id="SVG_6" class="w-5 h-5" viewBox="0 0 20 20">
          <g transform="matrix(1 0 0 1 0 0)">
            <g style="">
              <g transform="matrix(0.83 0 0 0.83 10 10)">
                <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(143,150,163); fill-rule: nonzero; opacity: 1;" transform=" translate(-12, -12)" d="M 14.0002 22 L 14.0002 18 C 14.0002 17.9631 14.002 17.9263 14.0061 17.8896 C 14.1162 16.8979 13.8315 15.903 13.2141 15.1191 C 12.977 14.8182 12.9336 14.4081 13.1008 14.0635 C 13.268 13.7189 13.6172 13.5 14.0002 13.5 C 16.6263 13.4999 19.0002 11.7847 19.0002 9 C 19.0002 8.97882 19.0008 8.95766 19.0022 8.93652 C 19.0675 7.91581 18.782 6.91379 18.1867 6.08203 C 18.0173 5.84531 17.9597 5.54652 18.0285 5.26367 C 18.1853 4.61969 18.2379 3.95753 18.1916 3.30078 C 17.798 3.49084 17.2671 3.79931 16.5998 4.2998 C 16.4033 4.44719 16.1606 4.51698 15.9182 4.49707 L 15.8137 4.48242 C 13.4539 4.03552 11.0266 4.00733 8.6584 4.39844 L 8.18575 4.48242 C 7.94418 4.5281 7.69546 4.48339 7.48653 4.3584 L 7.39961 4.2998 C 6.72437 3.7934 6.18914 3.48337 5.79414 3.29395 C 5.74351 3.94752 5.80069 4.6068 5.96797 5.24805 C 6.03342 5.49948 5.99801 5.76512 5.87227 5.98926 L 5.8127 6.08301 C 5.21953 6.91076 4.93186 7.91839 4.99825 8.93457 C 4.99967 8.95628 5.0002 8.97824 5.0002 9 C 5.0002 11.7847 7.37402 13.5 10.0002 13.5 C 10.384 13.5001 10.7338 13.7198 10.9006 14.0654 C 11.0673 14.4113 11.0215 14.8226 10.7824 15.123 C 10.4732 15.5116 10.2456 15.9531 10.1125 16.4229 C 9.97847 16.896 9.93776 17.395 9.99336 17.8877 L 10.0002 18 L 10.0002 22 C 10.0002 22.5522 9.55239 22.9999 9.0002 23 C 8.44791 23 8.0002 22.5523 8.0002 22 L 8.0002 18.0439 C 7.9269 17.3186 7.98803 16.5817 8.1877 15.877 C 8.24095 15.6891 8.30414 15.5047 8.37618 15.3242 C 5.57562 14.7211 3.03347 12.5671 3.00215 9.06543 L 2.99043 8.78809 C 2.96345 7.5601 3.29118 6.35214 3.93086 5.30664 C 3.69474 4.12878 3.72792 2.91559 4.03243 1.74805 L 4.08809 1.58887 C 4.2474 1.23511 4.60204 1 5.0002 1 L 5.0002 2 C 5.0002 1.04284 5.00047 1.00176 5.00118 1 L 5.02657 1 C 5.03627 1.00023 5.04718 1.00043 5.05879 1.00098 C 5.08203 1.00207 5.10906 1.00396 5.13985 1.00684 C 5.2019 1.01265 5.27925 1.02377 5.37129 1.04102 C 5.55581 1.07561 5.79946 1.138 6.10078 1.25098 C 6.6346 1.45116 7.34902 1.80826 8.24434 2.44141 C 10.7281 2.02101 13.2714 2.02107 15.7551 2.44141 C 16.6505 1.80815 17.3648 1.4512 17.8986 1.25098 C 18.2 1.13795 18.4436 1.07563 18.6281 1.04102 C 18.7203 1.02374 18.7975 1.01266 18.8596 1.00684 C 18.8906 1.00392 18.9182 1.00207 18.9416 1.00098 C 18.9532 1.00043 18.9641 1.00023 18.9738 1 L 18.9982 1 C 18.9989 0.999999 19.0001 1 19.0002 1.76172 L 19.0002 1 C 19.4613 1.00009 19.8628 1.31567 19.9719 1.76367 C 20.2544 2.92415 20.2845 4.12937 20.0647 5.2998 C 20.7565 6.42753 21.0831 7.73667 20.9982 9.06348 C 20.9678 12.5691 18.421 14.7249 15.6174 15.3262 C 15.9575 16.1809 16.0924 17.1113 16.0002 18.042 L 16.0002 22 C 16.0002 22.5522 15.5524 22.9999 15.0002 23 C 14.4479 23 14.0002 22.5523 14.0002 22 Z" stroke-linecap="round" />
              </g>
              <g transform="matrix(0.83 0 0 0.83 4.58 14.4)">
                <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(143,150,163); fill-rule: nonzero; opacity: 1;" transform=" translate(-5.5, -17.28)" d="M 2 15 C 2.8652 15 3.50263 15.4442 3.95703 15.8369 C 4.18347 16.0327 4.40872 16.2565 4.60059 16.4424 C 4.80333 16.6388 4.98899 16.8138 5.18359 16.9697 C 5.56205 17.2729 5.942 17.4776 6.41504 17.54 C 6.89595 17.6034 7.58469 17.5338 8.59473 17.0859 C 9.09958 16.8621 9.69018 17.0899 9.91406 17.5947 C 10.1379 18.0996 9.91012 18.6902 9.40527 18.9141 C 8.16037 19.4661 7.09616 19.6466 6.1543 19.5225 C 5.20472 19.3973 4.49127 18.977 3.93359 18.5303 C 3.66026 18.3113 3.41733 18.0798 3.20898 17.8779 C 2.98971 17.6655 2.82052 17.4985 2.64941 17.3506 C 2.30852 17.0559 2.13462 17 2 17 C 1.44772 17 1 16.5523 1 16 C 1 15.4477 1.44772 15 2 15 Z" stroke-linecap="round" />
              </g>
            </g>
          </g>
        </svg>
              </a>
              <a href="#" class="text-[#8F96A3] hover:text-[#2563EB] transition-colors">
                <svg data-svg-id="SVG_7" class="w-5 h-5" viewBox="0 0 20 20">
          <g transform="matrix(1 0 0 1 0 0)">
            <g style="">
              <g transform="matrix(0.83 0 0 0.83 13.33 12.08)">
                <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(143,150,163); fill-rule: nonzero; opacity: 1;" transform=" translate(-16, -14.5)" d="M 21 14 C 21 12.6739 20.4728 11.4025 19.5352 10.4648 C 18.5975 9.52716 17.3261 9 16 9 C 14.6739 9 13.4025 9.52716 12.4648 10.4648 C 11.5272 11.4025 11 12.6739 11 14 L 11 20 L 13 20 L 13 14 C 13 13.2043 13.3163 12.4415 13.8789 11.8789 C 14.4415 11.3163 15.2043 11 16 11 C 16.7957 11 17.5585 11.3163 18.1211 11.8789 C 18.6837 12.4415 19 13.2043 19 14 L 19 20 L 21 20 L 21 14 Z M 23 21 C 23 21.5523 22.5523 22 22 22 L 18 22 C 17.4477 22 17 21.5523 17 21 L 17 14 C 17 13.7348 16.8946 13.4805 16.707 13.293 C 16.5195 13.1054 16.2652 13 16 13 C 15.7348 13 15.4805 13.1054 15.293 13.293 C 15.1054 13.4805 15 13.7348 15 14 L 15 21 C 15 21.5523 14.5523 22 14 22 L 10 22 C 9.44772 22 9 21.5523 9 21 L 9 14 C 9 12.1435 9.73705 10.3626 11.0498 9.0498 C 12.3626 7.73705 14.1435 7 16 7 C 17.8565 7 19.6374 7.73705 20.9502 9.0498 C 22.263 10.3626 23 12.1435 23 14 L 23 21 Z" stroke-linecap="round" />
              </g>
              <g transform="matrix(0.83 0 0 0.83 3.33 12.5)">
                <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(143,150,163); fill-rule: nonzero; opacity: 1;" transform=" translate(-4, -15)" d="M 6 8 L 6.10254 8.00488 C 6.60667 8.05621 7 8.48232 7 9 L 7 21 C 7 21.5523 6.55228 22 6 22 L 2 22 C 1.44772 22 1 21.5523 1 21 L 1 9 L 1.00488 8.89746 C 1.05621 8.39333 1.48232 8 2 8 L 6 8 Z M 3 20 L 5 20 L 5 10 L 3 10 L 3 20 Z" stroke-linecap="round" />
              </g>
              <g transform="matrix(0.83 0 0 0.83 3.33 3.33)">
                <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(143,150,163); fill-rule: nonzero; opacity: 1;" transform=" translate(-4, -4)" d="M 5 4 C 5 3.44772 4.55228 3 4 3 C 3.44772 3 3 3.44772 3 4 C 3 4.55228 3.44772 5 4 5 C 4.55228 5 5 4.55228 5 4 Z M 7 4 C 7 5.65685 5.65685 7 4 7 C 2.34315 7 1 5.65685 1 4 C 1 2.34315 2.34315 1 4 1 C 5.65685 1 7 2.34315 7 4 Z" stroke-linecap="round" />
              </g>
            </g>
          </g>
        </svg>
              </a>
            </div>
          </div>

          <!-- Links Columns -->
          <div v-for="group in footerLinks" :key="group.title" class="col-span-1">
            <h3 class="text-xs font-semibold uppercase tracking-widest mb-6 text-[#323843] font-['Sora']">
              {{ group.title }}
            </h3>
            <ul class="space-y-4">
              <li v-for="link in group.links" :key="link">
                <a href="#" class="text-sm text-[#8F96A3] hover:text-[#323843] transition-colors">
                  {{ link }}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <!-- Copyright -->
        <div class="pt-8 border-t border-[#f3f4f6] text-center">
          <p class="text-sm text-[#8F96A3]">
            © 2026 Bitcoin API, Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.auth-card {
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
  border: 1px solid #f3f4f6;
}

.text-divider {
  display: flex;
  align-items: center;
  text-align: center;
  width: 100%;
  color: #8F96A3;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.text-divider::before,
.text-divider::after {
  content: "";
  flex: 1;
  border-bottom: 1px solid #f3f4f6;
}

.text-divider:not(:empty)::before {
  margin-right: 1rem;
}

.text-divider:not(:empty)::after {
  margin-left: 1rem;
}

input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
}

/* Custom checkbox styling to match design */
input[type="checkbox"] {
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

input[type="checkbox"]::before {
  content: "";
  width: 10px;
  height: 10px;
  transform: scale(0);
  transition: 120ms transform ease-in-out;
  box-shadow: inset 1em 1em #2563EB;
  clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
}

input[type="checkbox"]:checked::before {
  transform: scale(1);
}
</style>