import crypto from 'node:crypto';
import { ApiKey } from 'shared/generated/prisma/client.js';
import { ApiKeyRepository, apiKeyRepository } from '#src/repositories/api-key.repository.js';

const TOKEN_BYTE_LENGTH = 30;
const TOKEN_PREFIX = 'bcn_';

export type ExecuteParams = {
  userId: string;
  name: string;
};

export class CreateApiKeyUsecase {
  constructor(private readonly apiKeyRepository: ApiKeyRepository) {}

  async execute({ userId, name }: ExecuteParams): Promise<ApiKey> {
    const token = this.generateToken();
    return this.apiKeyRepository.createKey({ userId, name, token });
  }

  generateToken(): string {
    const random = crypto.randomBytes(TOKEN_BYTE_LENGTH).toString('base64url');
    return `${TOKEN_PREFIX}${random}`;
  }
}

export const createApiKeyUsecase = new CreateApiKeyUsecase(apiKeyRepository);
