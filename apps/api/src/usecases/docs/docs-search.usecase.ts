import { GoogleAiProvider, googleAiProvider } from 'shared/src/providers/google-ai.provider.js';
import { ApiChunkRepository, apiChunkRepository } from 'shared/src/repositories/api-chunk.repository.js';
import { DocChunkRepository, docChunkRepository } from 'shared/src/repositories/doc-chunk.repository.js';
import { RecipeChunkRepository, recipeChunkRepository } from 'shared/src/repositories/recipe-chunk.repository.js';

export type SearchHit = {
  kind: 'doc' | 'recipe' | 'api';
  title: string;
  section?: string | null;
  url: string;
  anchor?: string | null;
  text: string;
  similarity: number;
};

export type ExecuteParams = {
  query: string;
  k?: number;
};

const DEFAULT_K = 8;
const PER_SOURCE_MULTIPLIER = 2;

export class DocsSearchUseCase {
  constructor(
    private readonly googleAi: GoogleAiProvider,
    private readonly docChunkRepo: DocChunkRepository,
    private readonly recipeChunkRepo: RecipeChunkRepository,
    private readonly apiChunkRepo: ApiChunkRepository
  ) {}

  async execute(params: ExecuteParams): Promise<SearchHit[]> {
    const k = params.k ?? DEFAULT_K;
    const perSource = Math.max(1, Math.ceil(k * PER_SOURCE_MULTIPLIER));

    const embedding = await this.googleAi.embed(params.query, 'RETRIEVAL_QUERY');

    const [docs, recipes, apis] = await Promise.all([
      this.docChunkRepo.searchByVector(embedding, perSource),
      this.recipeChunkRepo.searchByVector(embedding, perSource),
      this.apiChunkRepo.searchByVector(embedding, perSource),
    ]);

    const hits: SearchHit[] = [
      ...docs.map((c, i) => ({
        kind: 'doc' as const,
        title: c.title,
        section: c.section,
        url: c.url,
        anchor: c.anchor,
        text: c.text,
        similarity: this.rankToSimilarity(i),
      })),
      ...recipes.map((c, i) => ({
        kind: 'recipe' as const,
        title: c.title,
        section: null,
        url: c.url,
        anchor: c.anchor,
        text: c.text,
        similarity: this.rankToSimilarity(i),
      })),
      ...apis.map((c, i) => ({
        kind: 'api' as const,
        title: `${c.method} ${c.path}`,
        section: c.summary ?? null,
        url: `/docs/api/${c.operationId}`,
        anchor: null,
        text: c.text,
        similarity: this.rankToSimilarity(i),
      })),
    ];

    return hits.sort((a, b) => b.similarity - a.similarity).slice(0, k);
  }

  private rankToSimilarity(rank: number): number {
    return 1 / (rank + 1);
  }
}

export const docsSearchUseCase = new DocsSearchUseCase(
  googleAiProvider,
  docChunkRepository,
  recipeChunkRepository,
  apiChunkRepository
);
