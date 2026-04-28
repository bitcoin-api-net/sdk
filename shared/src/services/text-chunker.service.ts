import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export type MarkdownChunk = {
  anchor: string;
  title: string;
  text: string;
};

const MAX_CHARS_PER_CHUNK = 2000; // ~500 tokens, well under text-embedding-004 limit
const CHUNK_OVERLAP = 200;

export class TextChunker {
  private markdownSplitter = RecursiveCharacterTextSplitter.fromLanguage('markdown', {
    chunkSize: MAX_CHARS_PER_CHUNK,
    chunkOverlap: CHUNK_OVERLAP,
  });

  async chunkMarkdown(text: string): Promise<MarkdownChunk[]> {
    const sections = this.splitByHeadings(text);
    const chunks: MarkdownChunk[] = [];

    for (const section of sections) {
      if (section.text.length <= MAX_CHARS_PER_CHUNK) {
        chunks.push(section);
        continue;
      }

      const parts = await this.markdownSplitter.splitText(section.text);
      parts.forEach((part, idx) => {
        chunks.push({
          anchor: idx === 0 ? section.anchor : `${section.anchor}-${idx + 1}`,
          title: section.title,
          text: part,
        });
      });
    }

    return chunks;
  }

  slugify(input: string): string {
    return (
      input
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80) || 'section'
    );
  }

  private splitByHeadings(text: string): MarkdownChunk[] {
    const lines = text.split('\n');
    const result: MarkdownChunk[] = [];

    let currentTitle = 'Introduction';
    let currentAnchor = 'introduction';
    let buffer: string[] = [];

    const flush = () => {
      const body = buffer.join('\n').trim();
      if (!body) return;
      result.push({ anchor: currentAnchor, title: currentTitle, text: body });
      buffer = [];
    };

    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*$/);
      if (headingMatch) {
        flush();
        currentTitle = headingMatch[2]!.trim();
        currentAnchor = this.slugify(currentTitle);
        buffer.push(line);
      } else {
        buffer.push(line);
      }
    }
    flush();

    return result;
  }
}

export const textChunker = new TextChunker();
