import env, { required } from '../env.js';
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = required(env.GEMINI_API_KEY);

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIM = 768;

const COMPLETION_MODEL = 'gemini-2.5-flash-lite';
const COMPLETION_TEMPERATURE = 0.3;
const COMPLETION_MAX_OUTPUT_TOKENS = 600;

export type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

export type StreamCompletionParams = {
  system: string;
  user: string;
  contextChunks: Array<{ title: string; section?: string | null; text: string }>;
};

export class GoogleAiProvider {
  private readonly client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }

  async embed(text: string, taskType: EmbeddingTaskType): Promise<number[]> {
    const response = await this.client.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
      config: {
        taskType,
        outputDimensionality: EMBEDDING_DIM,
      },
    });

    const values = response.embeddings?.[0]?.values;
    if (!values || values.length !== EMBEDDING_DIM) {
      throw new Error(`Gemini embed returned invalid vector (got ${values?.length ?? 0}, expected ${EMBEDDING_DIM})`);
    }
    return values;
  }

  async *streamCompletion(params: StreamCompletionParams): AsyncIterable<string> {
    const { system, user, contextChunks } = params;
    const userPrompt = this.buildUserPrompt(user, contextChunks);

    const stream = await this.client.models.generateContentStream({
      model: COMPLETION_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: system,
        temperature: COMPLETION_TEMPERATURE,
        maxOutputTokens: COMPLETION_MAX_OUTPUT_TOKENS,
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) yield text;
    }
  }

  private buildUserPrompt(query: string, chunks: StreamCompletionParams['contextChunks']): string {
    if (chunks.length === 0) {
      return `Question: ${query}\n\nNo context available.`;
    }
    const ctx = chunks
      .map((c, i) => {
        const header = c.section ? `${c.title} — ${c.section}` : c.title;
        return `[${i + 1}] ${header}\n${c.text}`;
      })
      .join('\n\n---\n\n');
    return `Context:\n\n${ctx}\n\n---\n\nQuestion: ${query}`;
  }
}

export const googleAiProvider = new GoogleAiProvider();
