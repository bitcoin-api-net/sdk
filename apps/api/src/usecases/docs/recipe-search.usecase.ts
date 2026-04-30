import { GoogleAiProvider, googleAiProvider } from 'shared/src/providers/google-ai.provider.js';
import {
  RecipeChunkRepository,
  recipeChunkRepository,
} from 'shared/src/repositories/recipe-chunk.repository.js';

type RecipeChunk = Awaited<ReturnType<RecipeChunkRepository['findByEndpoint']>>[number];

export type ExecuteParams = {
  operationId?: string;
  query?: string;
  language?: string;
  k?: number;
};

export type RecipeHit = {
  url: string;
  anchor: string;
  title: string;
  description: string | null;
  language: string;
  difficulty: string | null;
  tags: string[];
  runUrl: string | null;
  endpoints: string[];
  text: string;
};

const DEFAULT_K = 10;

export class RecipeSearchUseCase {
  constructor(
    private readonly googleAi: GoogleAiProvider,
    private readonly recipeChunkRepo: RecipeChunkRepository,
  ) {}

  async execute(params: ExecuteParams): Promise<RecipeHit[]> {
    const k = params.k ?? DEFAULT_K;
    let chunks: RecipeChunk[];

    if (params.operationId) {
      chunks = await this.recipeChunkRepo.findByEndpoint(params.operationId);
      if (params.query) {
        const ranked = await this.rankByQuery(params.query, chunks);
        chunks = ranked;
      }
    } else if (params.query) {
      const embedding = await this.googleAi.embed(params.query, 'RETRIEVAL_QUERY');
      // Over-fetch to leave room for language filter.
      chunks = await this.recipeChunkRepo.searchByVector(embedding, k * 3);
    } else {
      return [];
    }

    if (params.language) {
      const lang = params.language.toLowerCase();
      chunks = chunks.filter((c) => c.language.toLowerCase() === lang);
    }

    return chunks.slice(0, k).map((c) => this.toHit(c));
  }

  private async rankByQuery(query: string, chunks: RecipeChunk[]): Promise<RecipeChunk[]> {
    if (chunks.length <= 1) return chunks;
    // Simple lexical re-rank by query term overlap. Cheap and good enough
    // when the candidate set is already filtered by `operationId`.
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);
    if (terms.length === 0) return chunks;

    const scored = chunks.map((c) => {
      const haystack = `${c.title}\n${c.description ?? ''}\n${c.text}`.toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (haystack.includes(t)) score += 1;
      }
      return { c, score };
    });
    return scored.sort((a, b) => b.score - a.score).map((s) => s.c);
  }

  private toHit(c: RecipeChunk): RecipeHit {
    return {
      url: c.url,
      anchor: c.anchor,
      title: c.title,
      description: c.description,
      language: c.language,
      difficulty: c.difficulty,
      tags: c.tags,
      runUrl: c.runUrl,
      endpoints: c.endpoints,
      text: c.text,
    };
  }
}

export const recipeSearchUseCase = new RecipeSearchUseCase(
  googleAiProvider,
  recipeChunkRepository,
);
