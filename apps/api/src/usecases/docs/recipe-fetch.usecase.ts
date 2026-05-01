import { RecipeChunkRepository, recipeChunkRepository } from 'shared/src/repositories/recipe-chunk.repository.js';

export type ExecuteParams = {
  url: string;
};

export type RecipeFetchResult = {
  url: string;
  title: string;
  description: string | null;
  language: string;
  difficulty: string | null;
  tags: string[];
  runUrl: string | null;
  endpoints: string[];
  markdown: string;
};

export class RecipeFetchUseCase {
  constructor(private readonly recipeChunkRepo: RecipeChunkRepository) {}

  async execute(params: ExecuteParams): Promise<RecipeFetchResult | null> {
    const chunks = await this.recipeChunkRepo.findByUrl(params.url);
    if (chunks.length === 0) return null;

    const head = chunks[0];
    const markdown = chunks.map((c) => c.text.trim()).join('\n\n');

    return {
      url: head.url,
      title: head.title,
      description: head.description,
      language: head.language,
      difficulty: head.difficulty,
      tags: head.tags,
      runUrl: head.runUrl,
      endpoints: head.endpoints,
      markdown,
    };
  }
}

export const recipeFetchUseCase = new RecipeFetchUseCase(recipeChunkRepository);
