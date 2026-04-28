<script setup lang="ts">
import { create, load, search } from '@orama/orama';
import { computed, onMounted, ref } from 'vue';

type Hit = {
  id: string;
  kind: 'doc' | 'recipe' | 'api';
  title: string;
  section: string;
  description: string;
  url: string;
};

type SearchResult = {
  document: Hit;
  positions?: Record<string, Record<string, Array<{ start: number; length: number }>>>;
};

const query = ref('');
const results = ref<SearchResult[]>([]);
const open = ref(false);
const ready = ref(false);
const activeIdx = ref(-1);
const loading = ref(false);

let db: Awaited<ReturnType<typeof create>> | null = null;

async function ensureDb() {
  if (db) return db;
  loading.value = true;
  try {
    const res = await fetch('/search-index.json');
    const dump = await res.json();
    db = create({
      schema: {
        id: 'string',
        kind: 'string',
        title: 'string',
        section: 'string',
        description: 'string',
        body: 'string',
        url: 'string',
        tags: 'string[]',
      },
      components: {
        tokenizer: { language: 'english', stemming: true },
      },
    });
    await load(db, dump);
    ready.value = true;
    return db;
  } finally {
    loading.value = false;
  }
}

async function runSearch() {
  const term = query.value.trim();
  if (!term) {
    results.value = [];
    open.value = false;
    return;
  }
  const inst = await ensureDb();
  const r = await search(inst, {
    term,
    properties: ['title', 'section', 'description', 'body', 'tags'],
    boost: { title: 3, section: 1.5, description: 1.2 },
    tolerance: 1,
    limit: 10,
  });
  results.value = (r.hits as unknown as SearchResult[]) ?? [];
  open.value = results.value.length > 0;
  activeIdx.value = -1;
}

let debounceId: ReturnType<typeof setTimeout> | null = null;
function onInput() {
  if (debounceId) clearTimeout(debounceId);
  debounceId = setTimeout(runSearch, 80);
}

function onFocus() {
  if (results.value.length > 0) open.value = true;
}

function onBlur() {
  setTimeout(() => {
    open.value = false;
  }, 120);
}

function onKey(e: KeyboardEvent) {
  if (!open.value) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeIdx.value = Math.min(activeIdx.value + 1, results.value.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeIdx.value = Math.max(activeIdx.value - 1, 0);
  } else if (e.key === 'Enter') {
    const hit = results.value[activeIdx.value] ?? results.value[0];
    if (hit) {
      window.location.href = hit.document.url;
    }
  } else if (e.key === 'Escape') {
    open.value = false;
  }
}

const placeholder = computed(() => (loading.value ? 'Loading index…' : 'Search documentation…'));

function highlight(text: string): string {
  const term = query.value.trim();
  if (!term) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'ig'), '<mark>$1</mark>');
}

onMounted(() => {
  ensureDb().catch(() => undefined);
});
</script>

<template>
  <div class="search-traditional">
    <span class="search-traditional__icon" aria-hidden="true">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    </span>
    <input
      v-model="query"
      class="search-traditional__input"
      type="search"
      autocomplete="off"
      :placeholder="placeholder"
      aria-label="Search documentation"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @keydown="onKey" />
    <div v-if="open" class="search-traditional__dropdown" role="listbox">
      <a
        v-for="(hit, idx) in results"
        :key="hit.document.id"
        :href="hit.document.url"
        class="search-traditional__hit"
        :class="{ 'search-traditional__hit--active': idx === activeIdx }"
        role="option"
        :aria-selected="idx === activeIdx">
        <span class="search-traditional__kind" :data-kind="hit.document.kind">{{ hit.document.kind }}</span>
        <span class="search-traditional__title" v-html="highlight(hit.document.title)" />
        <span class="search-traditional__section">{{ hit.document.section }}</span>
        <span class="search-traditional__desc" v-html="highlight(hit.document.description)" />
      </a>
    </div>
  </div>
</template>

<style scoped>
.search-traditional {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 100%;
  min-width: 0;
}
.search-traditional__icon {
  display: inline-flex;
  color: #565d6d;
  flex-shrink: 0;
}
.search-traditional__input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.9375rem;
  color: #171a1f;
}
.search-traditional__input::placeholder {
  color: #8b93a1;
}
.search-traditional__input::-webkit-search-cancel-button {
  -webkit-appearance: none;
  appearance: none;
}
.search-traditional__dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: -0.875rem;
  right: -0.25rem;
  max-height: 60vh;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #e2e6ec;
  border-radius: 12px;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.08),
    0 2px 6px rgba(0, 0, 0, 0.04);
  padding: 0.375rem;
  z-index: 60;
}
.search-traditional__hit {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto auto;
  gap: 0.125rem 0.5rem;
  padding: 0.625rem 0.75rem;
  border-radius: 8px;
  text-decoration: none;
  color: #171a1f;
}
.search-traditional__hit:hover,
.search-traditional__hit--active {
  background: rgba(9, 131, 253, 0.08);
}
.search-traditional__kind {
  grid-row: 1;
  align-self: center;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  background: #f1f5f9;
  color: #475569;
}
.search-traditional__kind[data-kind='api'] {
  background: #dbeafe;
  color: #1d4ed8;
}
.search-traditional__kind[data-kind='recipe'] {
  background: #dcfce7;
  color: #16a34a;
}
.search-traditional__title {
  grid-row: 1;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #171a1f;
}
.search-traditional__section {
  grid-row: 1;
  align-self: center;
  font-size: 0.75rem;
  color: #8b93a1;
  text-align: right;
}
.search-traditional__desc {
  grid-row: 2;
  grid-column: 2 / 4;
  font-size: 0.8125rem;
  color: #565d6d;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
:deep(mark) {
  background: rgba(9, 131, 253, 0.18);
  color: inherit;
  padding: 0 0.1rem;
  border-radius: 2px;
}
</style>
