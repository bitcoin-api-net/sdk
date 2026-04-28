import { GoogleGenAI } from '@google/genai';
import env, { required } from '../env.js';

const GEMINI_API_KEY = required(env.GEMINI_API_KEY);

const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIM = 768;

export type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

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
      throw new Error(
        `Gemini embed returned invalid vector (got ${values?.length ?? 0}, expected ${EMBEDDING_DIM})`
      );
    }
    return values;
  }
}

export const googleAiProvider = new GoogleAiProvider();
