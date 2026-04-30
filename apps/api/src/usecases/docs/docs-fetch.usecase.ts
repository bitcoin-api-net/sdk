import {
  DocChunkRepository,
  docChunkRepository,
} from 'shared/src/repositories/doc-chunk.repository.js';

export type ExecuteParams = {
  url: string;
};

export type DocsFetchResult = {
  url: string;
  title: string;
  markdown: string;
};

export class DocsFetchUseCase {
  constructor(private readonly docChunkRepo: DocChunkRepository) {}

  async execute(params: ExecuteParams): Promise<DocsFetchResult | null> {
    const chunks = await this.docChunkRepo.findByUrl(params.url);
    if (chunks.length === 0) return null;

    const title = chunks[0].title;
    const markdown = chunks.map((c) => c.text.trim()).join('\n\n');

    return { url: params.url, title, markdown };
  }
}

export const docsFetchUseCase = new DocsFetchUseCase(docChunkRepository);
