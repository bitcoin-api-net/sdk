<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'

type DevState = 'Default' | 'Error' | 'Loading' | 'Success'
const currentStatus = ref<DevState>('Default')

const email = ref('')
const password = ref('')

const setStatus = (status: DevState) => {
  currentStatus.value = status
}
</script>

<template>
  <div class="min-h-screen bg-white font-['Inter'] flex flex-col">
    <!-- Header -->
    <header class="h-[77px] border-b border-[#f3f4f6] bg-white sticky top-0 z-50">
      <div class="max-w-[1440px] mx-auto h-full px-6 md:px-12 flex items-center justify-between">
        <div class="flex items-center gap-10">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-[#0983FD] rounded-[10px] shadow-sm flex items-center justify-center">
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
            <span class="text-[18px] font-bold text-[#181B20] tracking-[-0.45px]">Bitcoin API</span>
          </div>
          
          <nav class="hidden md:flex items-center gap-8">
            <a href="#" class="text-[14px] font-medium text-[#8F96A3] hover:text-[#181B20] transition-colors">Products</a>
            <a href="#" class="text-[14px] font-medium text-[#8F96A3] hover:text-[#181B20] transition-colors">Docs</a>
            <a href="#" class="text-[14px] font-medium text-[#8F96A3] hover:text-[#181B20] transition-colors">Pricing</a>
          </nav>
        </div>

        <button class="text-[14px] font-medium text-[#8F96A3] hover:text-[#181B20] px-4 py-2 transition-colors">
          Log in
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-grow flex items-center justify-center py-16 px-4">
      <div class="w-full max-w-[440px] bg-white rounded-[14px] border border-[#f3f4f6] shadow-sm p-10">
        <h1 class="text-[28px] font-semibold text-[#181B20] leading-[35px] tracking-[-0.7px] mb-3">
          Create your account
        </h1>
        <p class="text-[14px] text-[#8F96A3] leading-[23px] mb-8">
          Get an API key and start building with public endpoints. Sign up quickly or use Google for a fast start.
        </p>

        <!-- Google Login -->
        <button class="w-full h-11 flex items-center justify-center gap-3 border border-[#dee1e6] rounded-[10px] hover:bg-gray-50 transition-colors mb-6">
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
          <span class="text-[14px] font-medium text-[#181B20]">Continue with Google</span>
        </button>

        <!-- Divider -->
        <div class="divider-text flex items-center text-[12px] font-medium text-[#8F96A3] uppercase tracking-wider mb-8">
          or continue with email
        </div>

        <!-- Form -->
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
            <Icon v-if="currentStatus === 'Loading'" icon="lucide:loader-2" class="w-5 h-5 animate-spin" />
            <Icon v-if="currentStatus === 'Success'" icon="lucide:check-circle" class="w-5 h-5" />
            <span>
              {{ 
                currentStatus === 'Loading' ? 'Creating account...' : 
                currentStatus === 'Success' ? 'Account Created!' : 
                'Create account' 
              }}
            </span>
          </button>
        </form>

        <div class="mt-8 text-center">
          <p class="text-[14px] text-[#8F96A3]">
            Already have an account? 
            <a href="#" class="text-[#0983FD] font-medium hover:underline">Log in</a>
          </p>
        </div>

        <div class="mt-12 text-center">
          <p class="text-[12px] text-[#8F96A3] leading-[20px]">
            By creating an account, you agree to the 
            <a href="#" class="underline">Terms of Service</a> and 
            <a href="#" class="underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="bg-[#F9FAFB] border-t border-[#f3f4f6] pt-16 pb-8">
      <div class="max-w-[1440px] mx-auto px-6 md:px-20">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">
          <!-- Brand Column -->
          <div class="lg:col-span-4">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-7 h-7 bg-[#0983FD] rounded-[4px] shadow-sm flex items-center justify-center">
                <svg data-svg-id="SVG_3" class="w-4 h-4 text-white" viewBox="0 0 16 16">
              <g transform="matrix(1 0 0 1 0 0)">
                <g style="">
                  <g transform="matrix(0.67 0 0 0.67 7.73 7.9)">
                    <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(255,255,255); fill-rule: nonzero; opacity: 1;" transform=" translate(-11.6, -11.85)" d="M 9.64417 2.36352 C 9.78218 1.87583 10.27 1.56267 10.7799 1.65258 C 11.3236 1.74864 11.6864 2.267 11.5905 2.81079 L 11.4166 3.79614 L 13.3864 4.14379 L 13.5612 3.15844 C 13.6572 2.61458 14.1765 2.25085 14.7203 2.34692 C 15.264 2.44315 15.6269 2.96235 15.5309 3.5061 L 15.3414 4.57446 C 16.3357 4.93464 17.1006 5.54442 17.6119 6.31372 C 18.2686 7.30173 18.4625 8.48276 18.2701 9.57348 C 18.0778 10.6642 17.4917 11.7075 16.5368 12.4114 C 16.3756 12.5301 16.2048 12.6359 16.027 12.7317 C 16.1612 12.8825 16.2854 13.0406 16.3961 13.2073 C 17.0525 14.1953 17.2448 15.3764 17.0524 16.467 C 16.86 17.5577 16.2748 18.6011 15.32 19.3049 C 14.5768 19.8527 13.6502 20.1635 12.5934 20.1623 L 12.4059 21.2317 L 12.3834 21.3313 C 12.246 21.8194 11.7578 22.1338 11.2477 22.0442 C 10.7039 21.9485 10.3406 21.4299 10.4362 20.886 L 10.609 19.8997 L 8.63734 19.552 L 8.46449 20.5373 L 7.48011 20.3635 L 6.49476 20.1907 L 6.66859 19.2043 L 5.68616 19.0315 L 5.58656 19.009 C 5.09881 18.871 4.78567 18.3832 4.87562 17.8733 C 4.97157 17.3294 5.48994 16.9658 6.03382 17.0618 L 7.01527 17.2346 L 9.09925 5.41723 L 8.11585 5.24438 L 8.01624 5.22192 C 7.5287 5.08381 7.21541 4.59598 7.30531 4.08618 C 7.39527 3.57638 7.85654 3.22585 8.36195 3.26293 L 8.46351 3.27563 L 9.44593 3.44848 L 9.62074 2.46313 L 9.64417 2.36352 Z M 8.46449 20.5373 C 8.36857 21.0812 7.85018 21.4448 7.30628 21.3489 C 6.76255 21.253 6.39912 20.7344 6.49476 20.1907 L 8.46449 20.5373 Z M 8.98499 17.5823 L 11.941 18.1038 L 12.1227 18.1321 C 13.0159 18.2496 13.6745 18.0338 14.1334 17.6956 C 14.6376 17.324 14.972 16.752 15.0836 16.1194 C 15.1951 15.4868 15.0766 14.8353 14.7301 14.3137 C 14.4146 13.839 13.8694 13.4112 12.9899 13.2161 L 12.8092 13.1799 L 12.8063 13.179 L 9.85316 12.6584 L 8.98499 17.5823 Z M 10.2008 10.6887 L 13.1578 11.2102 L 13.3395 11.2385 C 14.2328 11.3563 14.8914 11.1401 15.3502 10.802 C 15.8543 10.4305 16.1889 9.85846 16.3004 9.22583 C 16.4118 8.59347 16.2933 7.94252 15.9469 7.42114 C 15.6104 6.91477 15.0126 6.46036 14.026 6.28637 L 14.0241 6.28637 C 14.0227 6.28614 14.0215 6.28563 14.0201 6.2854 L 11.069 5.76489 L 10.2008 10.6887 Z" stroke-linecap="round" />
                  </g>
                </g>
              </g>
            </svg>
              </div>
              <span class="text-[16px] font-bold text-[#181B20] tracking-[-0.4px]">Bitcoin API</span>
            </div>
            <p class="text-[14px] text-[#8F96A3] leading-[23px] max-w-[300px] mb-6">
              The most reliable infrastructure for building Bitcoin applications. Enterprise-grade endpoints, webhooks, and indexing.
            </p>
            <div class="flex items-center gap-4">
              <a href="#" class="text-[#8F96A3] hover:text-[#181B20] transition-colors">
                <svg data-svg-id="SVG_4" class="w-5 h-5" viewBox="0 0 20 20">
          <g transform="matrix(1 0 0 1 0 0)">
            <g style="">
              <g transform="matrix(0.83 0 0 0.83 10 10.42)">
                <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(143,150,163); fill-rule: nonzero; opacity: 1;" transform=" translate(-12, -12.5)" d="M 13.5752 3.58785 C 15.2923 2.69324 17.5324 2.74899 19.3115 4.15133 C 19.3985 4.13033 19.4992 4.10363 19.6123 4.06539 C 19.8904 3.9714 20.1894 3.84084 20.4727 3.70211 C 20.7535 3.56459 21.0049 3.42587 21.1865 3.32125 C 21.2769 3.26919 21.349 3.22562 21.3975 3.19625 C 21.4217 3.18158 21.4405 3.17025 21.4522 3.16305 C 21.4577 3.15961 21.4615 3.15671 21.4639 3.15524 L 21.4658 3.15524 L 21.4668 3.15426 L 21.4658 3.15426 C 21.8232 2.92856 22.2845 2.95217 22.6172 3.21285 C 22.908 3.4409 23.0457 3.8075 22.9863 4.16403 L 22.9483 4.31637 L 22.9483 4.31832 L 22.9473 4.32028 C 22.9466 4.32223 22.9454 4.32513 22.9443 4.32809 C 22.9423 4.33397 22.9399 4.34187 22.9365 4.35153 C 22.9297 4.37112 22.9205 4.39847 22.9082 4.43258 C 22.8835 4.50106 22.8468 4.59812 22.7998 4.71676 C 22.7062 4.95344 22.5673 5.28148 22.3848 5.65328 C 22.0839 6.26615 21.6401 7.04085 21.0547 7.72555 C 22.3445 18.1499 11.0183 25.6897 1.88771 20.1132 L 1.44728 19.8339 C 1.07254 19.5856 0.910374 19.1168 1.04982 18.6894 C 1.18937 18.2624 1.59619 17.9808 2.04494 18.0009 C 3.40575 18.0628 4.75243 17.7802 5.91212 17.2002 C 1.55099 14.7939 -0.367632 9.10181 2.12111 4.52242 L 2.18654 4.41793 C 2.35225 4.18629 2.61124 4.03431 2.89845 4.00485 C 3.22665 3.97135 3.55058 4.1026 3.76369 4.35446 C 5.53242 6.44456 8.16475 7.75816 10.8916 7.97262 C 10.9026 5.97977 12.0241 4.39605 13.5752 3.58785 Z M 18.3174 5.93063 C 17.1474 4.83889 15.6363 4.77035 14.5 5.36227 C 13.3853 5.94302 12.6281 7.15838 12.9776 8.79 C 13.0397 9.0802 12.9702 9.38361 12.7871 9.61715 C 12.6039 9.85072 12.326 9.99124 12.0293 9.99996 C 8.85378 10.0933 5.68513 8.90712 3.334 6.77828 C 2.17413 10.5587 4.34448 14.859 8.28712 16.042 C 8.63564 16.1465 8.90039 16.4325 8.97755 16.788 C 9.04502 17.0992 8.95977 17.4211 8.75392 17.6572 L 8.65822 17.7529 C 7.727 18.5676 6.62472 19.1646 5.44435 19.54 C 12.655 21.7442 20.3027 15.6202 19.0127 7.55758 C 18.9622 7.24115 19.0665 6.91997 19.293 6.69332 C 19.4748 6.51154 19.6439 6.30513 19.8027 6.08883 C 19.5438 6.15261 19.2703 6.20016 19 6.20016 C 18.7467 6.20016 18.5026 6.10345 18.3174 5.93063 Z" stroke-linecap="round" />
              </g>
            </g>
          </g>
        </svg>
              </a>
              <a href="#" class="text-[#8F96A3] hover:text-[#181B20] transition-colors">
                <svg data-svg-id="SVG_5" class="w-5 h-5" viewBox="0 0 20 20">
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
              <a href="#" class="text-[#8F96A3] hover:text-[#181B20] transition-colors">
                <svg data-svg-id="SVG_6" class="w-5 h-5" viewBox="0 0 20 20">
          <g transform="matrix(1 0 0 1 0 0)">
            <g style="">
              <g transform="matrix(0.83 0 0 0.83 10 10)">
                <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(143,150,163); fill-rule: nonzero; opacity: 1;" transform=" translate(-12, -12)" d="M 21 12 C 21 7.02944 16.9706 3 12 3 C 7.02944 3 3 7.02944 3 12 C 3 16.9706 7.02944 21 12 21 C 16.9706 21 21 16.9706 21 12 Z M 23 12 C 23 18.0751 18.0751 23 12 23 C 5.92487 23 1 18.0751 1 12 C 1 5.92487 5.92487 1 12 1 C 18.0751 1 23 5.92487 23 12 Z" stroke-linecap="round" />
              </g>
              <g transform="matrix(0.83 0 0 0.83 10 10)">
                <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(143,150,163); fill-rule: nonzero; opacity: 1;" transform=" translate(-12, -12)" d="M 14.9961 11.6758 C 14.9245 8.69287 13.8664 5.82525 12 3.51562 C 10.0661 5.90881 9 8.90114 9 12 L 9.00391 12.3242 C 9.07549 15.3069 10.1339 18.1739 12 20.4834 C 13.9336 18.0903 15 15.0986 15 12 L 14.9961 11.6758 Z M 16.9951 12.373 C 16.9026 16.2184 15.3834 19.8976 12.7246 22.6895 C 12.5359 22.8876 12.2737 23 12 23 C 11.7263 23 11.4641 22.8876 11.2754 22.6895 C 8.61661 19.8976 7.09737 16.2184 7.00488 12.373 L 7 12 C 7 8.02012 8.53074 4.1926 11.2754 1.31055 L 11.3496 1.24023 C 11.5299 1.08586 11.7604 1 12 1 C 12.2737 1 12.5359 1.11237 12.7246 1.31055 C 15.4693 4.1926 17 8.02012 17 12 L 16.9951 12.373 Z" stroke-linecap="round" />
              </g>
              <g transform="matrix(0.83 0 0 0.83 10 10)">
                <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(143,150,163); fill-rule: nonzero; opacity: 1;" transform=" translate(-12, -12)" d="M 22 11 C 22.5523 11 23 11.4477 23 12 C 23 12.5523 22.5523 13 22 13 L 2 13 C 1.44772 13 1 12.5523 1 12 C 1 11.4477 1.44772 11 2 11 L 22 11 Z" stroke-linecap="round" />
              </g>
            </g>
          </g>
        </svg>
              </a>
            </div>
          </div>

          <!-- Links Columns -->
          <div class="lg:col-span-2">
            <h4 class="text-[14px] font-semibold text-[#181B20] mb-5">Product</h4>
            <ul class="space-y-3">
              <li><a href="#" class="text-[14px] text-[#8F96A3] hover:text-[#181B20] transition-colors">Endpoints</a></li>
              <li><a href="#" class="text-[14px] text-[#8F96A3] hover:text-[#181B20] transition-colors">Webhooks</a></li>
              <li><a href="#" class="text-[14px] text-[#8F96A3] hover:text-[#181B20] transition-colors">Pricing</a></li>
              <li><a href="#" class="text-[14px] text-[#8F96A3] hover:text-[#181B20] transition-colors">Changelog</a></li>
            </ul>
          </div>

          <div class="lg:col-span-2">
            <h4 class="text-[14px] font-semibold text-[#181B20] mb-5">Resources</h4>
            <ul class="space-y-3">
              <li><a href="#" class="text-[14px] text-[#8F96A3] hover:text-[#181B20] transition-colors">Documentation</a></li>
              <li><a href="#" class="text-[14px] text-[#8F96A3] hover:text-[#181B20] transition-colors">API Reference</a></li>
              <li><a href="#" class="text-[14px] text-[#8F96A3] hover:text-[#181B20] transition-colors">Guides</a></li>
              <li><a href="#" class="text-[14px] text-[#8F96A3] hover:text-[#181B20] transition-colors">Status</a></li>
            </ul>
          </div>

          <div class="lg:col-span-2">
            <h4 class="text-[14px] font-semibold text-[#181B20] mb-5">Company</h4>
            <ul class="space-y-3">
              <li><a href="#" class="text-[14px] text-[#8F96A3] hover:text-[#181B20] transition-colors">About</a></li>
              <li><a href="#" class="text-[14px] text-[#8F96A3] hover:text-[#181B20] transition-colors">Blog</a></li>
              <li><a href="#" class="text-[14px] text-[#8F96A3] hover:text-[#181B20] transition-colors">Terms of Service</a></li>
              <li><a href="#" class="text-[14px] text-[#8F96A3] hover:text-[#181B20] transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        <!-- Bottom Bar -->
        <div class="pt-8 border-t border-[#f3f4f6] flex flex-col md:flex-row items-center justify-between gap-4">
          <p class="text-[12px] text-[#8F96A3]">© 2026 Bitcoin API Inc. All rights reserved.</p>
          <div class="flex items-center gap-6">
            <a href="#" class="text-[12px] text-[#8F96A3] hover:text-[#181B20] transition-colors">Terms</a>
            <a href="#" class="text-[12px] text-[#8F96A3] hover:text-[#181B20] transition-colors">Privacy</a>
            <a href="#" class="text-[12px] text-[#8F96A3] hover:text-[#181B20] transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>

    <!-- Dev States Bar -->
    <div class="fixed bottom-6 right-6 bg-white rounded-[12px] shadow-lg border border-[#f3f4f6] p-2 flex items-center gap-2 z-[100]">
      <span class="text-[12px] font-medium text-[#8F96A3] px-2">Dev States:</span>
      <div class="flex bg-gray-50 rounded-lg p-1">
        <button 
          @click="setStatus('Default')"
          class="px-3 py-1.5 text-[12px] font-medium rounded-md transition-all"
          :class="currentStatus === 'Default' ? 'bg-[#0983FD] text-white shadow-sm' : 'text-[#8F96A3] hover:text-[#181B20]'"
        >
          Default
        </button>
        <button 
          @click="setStatus('Error')"
          class="px-3 py-1.5 text-[12px] font-medium rounded-md transition-all"
          :class="currentStatus === 'Error' ? 'bg-[#0983FD] text-white shadow-sm' : 'text-[#8F96A3] hover:text-[#181B20]'"
        >
          Error
        </button>
        <button 
          @click="setStatus('Loading')"
          class="px-3 py-1.5 text-[12px] font-medium rounded-md transition-all"
          :class="currentStatus === 'Loading' ? 'bg-[#0983FD] text-white shadow-sm' : 'text-[#8F96A3] hover:text-[#181B20]'"
        >
          Loading
        </button>
        <button 
          @click="setStatus('Success')"
          class="px-3 py-1.5 text-[12px] font-medium rounded-md transition-all"
          :class="currentStatus === 'Success' ? 'bg-[#0983FD] text-white shadow-sm' : 'text-[#8F96A3] hover:text-[#181B20]'"
        >
          Success
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.divider-text::before,
.divider-text::after {
  content: "";
  flex: 1;
  border-bottom: 1px solid #f3f4f6;
}

.divider-text::before {
  margin-right: 1rem;
}

.divider-text::after {
  margin-left: 1rem;
}

/* Custom focus ring */
input:focus {
  outline: none;
  border-color: #0983FD;
  box-shadow: 0 0 0 4px rgba(9, 131, 253, 0.1);
}

/* Smooth transitions */
a, button, input {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>