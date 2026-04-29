import { AiSearchSource, searchRepository, SearchRepository } from '#src/repositories/search.repository.js';
import { GoogleAiProvider, googleAiProvider } from 'shared/src/providers/google-ai.provider.js';
import {
  ApiChunkRepository,
  apiChunkRepository,
} from 'shared/src/repositories/api-chunk.repository.js';
import {
  DocChunkRepository,
  docChunkRepository,
} from 'shared/src/repositories/doc-chunk.repository.js';
import {
  RecipeChunkRepository,
  recipeChunkRepository,
} from 'shared/src/repositories/recipe-chunk.repository.js';

const SYSTEM_PROMPT = [
  'You are a documentation assistant for Bitcoin API.',
  'Answer ONLY based on the provided context.',
  'Do NOT invent links or sources — sources are collected by the application; you return ONLY the answer text.',
  'If the context does not cover the question, say so plainly and refuse to answer.',
  'Refuse out-of-domain questions politely.',
  'Be concise and use Markdown when helpful.',
].join(' ');

const ROUTING_QUESTION_RE = /^\s*(how|what|why|when|where|which|who|can|does|do|is|are)\b/i;
const MIN_QUERY_LEN = 16;
const TOP_K_PER_SOURCE = 3;
const TOP_K_FINAL = 3;

export type AskAiEvent =
  | { type: 'sources'; data: AiSearchSource[] }
  | { type: 'token'; data: string }
  | { type: 'done' }
  | { type: 'fallback'; data: { reason: 'short_query' | 'cache_hit' } };

export type ExecuteParams = {
  query: string;
};

type ScoredChunk = {
  source: AiSearchSource;
  text: string;
  similarity: number;
};

export class AskAiUseCase {
  constructor(
    private readonly searchRepo: SearchRepository,
    private readonly googleAi: GoogleAiProvider,
    private readonly docChunkRepo: DocChunkRepository,
    private readonly recipeChunkRepo: RecipeChunkRepository,
    private readonly apiChunkRepo: ApiChunkRepository,
  ) {}

  async *execute(params: ExecuteParams): AsyncIterable<AskAiEvent> {
    const query = params.query.trim();

    if (!this.shouldRouteToLlm(query)) {
      yield { type: 'sources', data: [] };
      yield { type: 'token', data: 'Try the traditional search for short or keyword queries.' };
      yield { type: 'done' };
      return;
    }

    const cached = await this.searchRepo.findQuery(query);
    if (cached) {
      yield { type: 'sources', data: cached.sources };
      yield { type: 'token', data: cached.answer };
      yield { type: 'done' };
      return;
    }

    const embedding = await this.googleAi.embed(query, 'RETRIEVAL_QUERY');
    const chunks = await this.retrieveTopChunks(embedding);

    yield { type: 'sources', data: chunks.map((c) => c.source) };

    let answer = '';
    const stream = this.googleAi.streamCompletion({
      system: SYSTEM_PROMPT,
      user: query,
      contextChunks: chunks.map((c) => ({
        title: c.source.title,
        section: c.source.section ?? null,
        text: c.text,
      })),
    });
    for await (const token of stream) {
      answer += token;
      yield { type: 'token', data: token };
    }

    yield { type: 'done' };

    if (answer.length > 0) {
      await this.searchRepo.cacheQuery(query, { answer, sources: chunks.map((c) => c.source) });
    }
  }

  private shouldRouteToLlm(query: string): boolean {
    if (query.length <= MIN_QUERY_LEN - 1) return false;
    return query.includes('?') || ROUTING_QUESTION_RE.test(query);
  }

  private async retrieveTopChunks(embedding: number[]): Promise<ScoredChunk[]> {
    const [docs, recipes, apis] = await Promise.all([
      this.docChunkRepo.searchByVector(embedding, TOP_K_PER_SOURCE),
      this.recipeChunkRepo.searchByVector(embedding, TOP_K_PER_SOURCE),
      this.apiChunkRepo.searchByVector(embedding, TOP_K_PER_SOURCE),
    ]);

    const all: ScoredChunk[] = [
      ...docs.map((c, i) => ({
        source: {
          kind: 'doc' as const,
          title: c.title,
          section: c.section,
          url: c.url,
          anchor: c.anchor,
        },
        text: c.text,
        similarity: this.rankToSimilarity(i),
      })),
      ...recipes.map((c, i) => ({
        source: {
          kind: 'recipe' as const,
          title: c.title,
          section: null,
          url: c.url,
          anchor: c.anchor,
        },
        text: c.text,
        similarity: this.rankToSimilarity(i),
      })),
      ...apis.map((c, i) => ({
        source: {
          kind: 'api' as const,
          title: `${c.method} ${c.path}`,
          section: c.summary ?? null,
          url: `/docs/api/${c.operationId}`,
          anchor: null,
        },
        text: c.text,
        similarity: this.rankToSimilarity(i),
      })),
    ];

    return all.sort((a, b) => b.similarity - a.similarity).slice(0, TOP_K_FINAL);
  }

  private rankToSimilarity(rank: number): number {
    return 1 / (rank + 1);
  }
}

export const askAiUseCase = new AskAiUseCase(
  searchRepository,
  googleAiProvider,
  docChunkRepository,
  recipeChunkRepository,
  apiChunkRepository,
);
