<script setup lang="ts">
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import 'highlight.js/styles/github-dark.css';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import { computed, onMounted, ref } from 'vue';

type Source = {
  kind: 'doc' | 'recipe' | 'api';
  title: string;
  section?: string | null;
  url: string;
  anchor?: string | null;
};

type ServerEventName = 'sources' | 'token' | 'done' | 'error';

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('json', json);

const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
  }),
  { gfm: true, breaks: true },
);

const query = ref('');
const open = ref(false);
const loading = ref(false);
const answer = ref('');
const sources = ref<Source[]>([]);
const errorMessage = ref<string | null>(null);
const teleportReady = ref(false);

onMounted(() => {
  teleportReady.value = !!document.getElementById('docs-search-wrap');
});

const answerHtml = computed(() => {
  if (!answer.value) return '';
  return marked.parse(answer.value, { async: false }) as string;
});

let abortCtrl: AbortController | null = null;

const placeholder = computed(() => (loading.value ? 'Thinking…' : 'Ask anything about Bitcoin API…'));

async function ask() {
  const term = query.value.trim();
  if (!term || loading.value) return;

  abortCtrl?.abort();
  abortCtrl = new AbortController();

  answer.value = '';
  sources.value = [];
  errorMessage.value = null;
  loading.value = true;
  open.value = true;

  try {
    const res = await fetch(`${import.meta.env.PUBLIC_API_URL}/v1/docs/ask-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ query: term }),
      signal: abortCtrl.signal,
    });

    if (!res.ok || !res.body) {
      errorMessage.value = `Request failed (${res.status})`;
      loading.value = false;
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sepIdx;
      while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, sepIdx);
        buffer = buffer.slice(sepIdx + 2);
        handleRawEvent(raw);
      }
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      errorMessage.value = (err as Error).message ?? 'Stream failed';
    }
  } finally {
    loading.value = false;
  }
}

function handleRawEvent(raw: string) {
  let eventName: ServerEventName = 'token';
  const dataLines: string[] = [];
  for (const line of raw.split('\n')) {
    if (line.startsWith('event: ')) {
      eventName = line.slice(7).trim() as ServerEventName;
    } else if (line.startsWith('data: ')) {
      dataLines.push(line.slice(6));
    }
  }
  if (dataLines.length === 0) return;

  let payload: unknown;
  try {
    payload = JSON.parse(dataLines.join('\n'));
  } catch {
    return;
  }

  if (eventName === 'sources') {
    sources.value = payload as Source[];
  } else if (eventName === 'token') {
    answer.value += payload as string;
  } else if (eventName === 'error') {
    const msg = (payload as { message?: string }).message;
    errorMessage.value = msg ?? 'stream_failed';
  } else if (eventName === 'done') {
    loading.value = false;
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    ask();
  } else if (e.key === 'Escape') {
    open.value = false;
  }
}

function onFocus() {
  if (loading.value || answer.value || sources.value.length || errorMessage.value) open.value = true;
}

function onBlur(e: FocusEvent) {
  // Keep open while streaming, no matter where focus goes.
  if (loading.value) return;
  // Keep open if focus moves into the wrapper (e.g. clicking a source link, toggle, etc).
  const next = e.relatedTarget as HTMLElement | null;
  const wrap = document.getElementById('docs-search-wrap');
  if (next && wrap?.contains(next)) return;
  setTimeout(() => {
    open.value = false;
  }, 200);
}

function buildHref(s: Source): string {
  return s.anchor ? `${s.url}#${s.anchor}` : s.url;
}
</script>

<template>
  <div class="search-ai">
    <span class="search-ai__icon" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z" />
      </svg>
    </span>
    <input v-model="query" class="search-ai__input" type="search" autocomplete="off" :placeholder="placeholder" aria-label="Ask AI about documentation" @keydown="onKey" @focus="onFocus" @blur="onBlur" />
    <button type="button" class="search-ai__submit" :disabled="loading || !query.trim()" aria-label="Send" @mousedown.prevent @click="ask">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    </button>

    <Teleport to="#docs-search-wrap" :disabled="!teleportReady">
      <div v-if="open" class="search-ai__dropdown" role="region" aria-live="polite">
        <div v-if="errorMessage" class="search-ai__error">{{ errorMessage }}</div>

      <div v-if="loading && !answer" class="search-ai__thinking" aria-live="polite">
        <span class="search-ai__thinking-label">Thinking</span>
        <span class="search-ai__thinking-dots" aria-hidden="true">
          <span></span><span></span><span></span>
        </span>
      </div>

      <div v-else-if="answer" class="search-ai__answer">
        <div class="search-ai__answer-md" v-html="answerHtml" />
        <span v-if="loading" class="search-ai__cursor" aria-hidden="true">▋</span>
      </div>

        <div v-if="sources.length > 0" class="search-ai__sources">
          <div class="search-ai__sources-title">Sources</div>
          <a v-for="s in sources" :key="`${s.url}#${s.anchor ?? ''}`" :href="buildHref(s)" class="search-ai__source">
            <span class="search-ai__kind" :data-kind="s.kind">{{ s.kind }}</span>
            <span class="search-ai__source-title">{{ s.title }}</span>
            <span v-if="s.section" class="search-ai__source-section">{{ s.section }}</span>
          </a>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.search-ai {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 100%;
  min-width: 0;
}

.search-ai__icon {
  display: inline-flex;
  color: #565d6d;
  flex-shrink: 0;
}

.search-ai__input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.9375rem;
  color: #171a1f;
}

.search-ai__input::placeholder {
  color: #8b93a1;
}

.search-ai__input::-webkit-search-cancel-button {
  -webkit-appearance: none;
  appearance: none;
}

.search-ai__submit {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 9999px;
  border: none;
  background: #0983fd;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.15s, opacity 0.15s;
}

.search-ai__submit:disabled {
  background: #c4cad3;
  cursor: not-allowed;
}

.search-ai__dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  max-height: 70vh;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #e2e6ec;
  border-radius: 12px;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.08),
    0 2px 6px rgba(0, 0, 0, 0.04);
  padding: 0.875rem;
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.search-ai__error {
  font-size: 0.8125rem;
  color: #b91c1c;
  background: #fef2f2;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
}

.search-ai__thinking {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #565d6d;
}
.search-ai__thinking-label {
  font-weight: 500;
}
.search-ai__thinking-dots {
  display: inline-flex;
  gap: 3px;
}
.search-ai__thinking-dots span {
  width: 5px;
  height: 5px;
  border-radius: 9999px;
  background: #0983fd;
  opacity: 0.35;
  animation: search-ai-bounce 1.2s infinite ease-in-out;
}
.search-ai__thinking-dots span:nth-child(2) {
  animation-delay: 0.15s;
}
.search-ai__thinking-dots span:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes search-ai-bounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.35;
  }
  40% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

.search-ai__answer {
  font-size: 0.9375rem;
  line-height: 1.55;
  color: #171a1f;
  word-wrap: break-word;
}

.search-ai__answer-md :deep(p) {
  margin: 0 0 0.5rem 0;
}
.search-ai__answer-md :deep(p:last-child) {
  margin-bottom: 0;
}
.search-ai__answer-md :deep(ul),
.search-ai__answer-md :deep(ol) {
  margin: 0.25rem 0 0.5rem 0;
  padding-left: 1.25rem;
}
.search-ai__answer-md :deep(li) {
  margin: 0.125rem 0;
}
.search-ai__answer-md :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8125rem;
  background: #f1f5f9;
  color: #0f172a;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}
.search-ai__answer-md :deep(pre) {
  margin: 0.5rem 0;
  border-radius: 8px;
  overflow: hidden;
  font-size: 0.8125rem;
  line-height: 1.45;
}
.search-ai__answer-md :deep(pre code.hljs) {
  padding: 0.625rem 0.75rem;
}
.search-ai__answer-md :deep(a) {
  color: #0983fd;
  text-decoration: underline;
}
.search-ai__answer-md :deep(strong) {
  font-weight: 600;
}
.search-ai__answer-md :deep(h1),
.search-ai__answer-md :deep(h2),
.search-ai__answer-md :deep(h3) {
  font-size: 1rem;
  font-weight: 700;
  margin: 0.5rem 0 0.25rem 0;
}

.search-ai__cursor {
  display: inline-block;
  margin-left: 2px;
  color: #0983fd;
  animation: search-ai-blink 1s steps(2, start) infinite;
}

@keyframes search-ai-blink {
  to {
    visibility: hidden;
  }
}

.search-ai__sources {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border-top: 1px solid #eef0f4;
  padding-top: 0.625rem;
}

.search-ai__sources-title {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #8b93a1;
  margin-bottom: 0.25rem;
}

.search-ai__source {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  border-radius: 8px;
  text-decoration: none;
  color: #171a1f;
}

.search-ai__source:hover {
  background: rgba(9, 131, 253, 0.08);
}

.search-ai__kind {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  background: #f1f5f9;
  color: #475569;
}

.search-ai__kind[data-kind='api'] {
  background: #dbeafe;
  color: #1d4ed8;
}

.search-ai__kind[data-kind='recipe'] {
  background: #dcfce7;
  color: #16a34a;
}

.search-ai__source-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #171a1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-ai__source-section {
  font-size: 0.75rem;
  color: #8b93a1;
  text-align: right;
}
</style>
