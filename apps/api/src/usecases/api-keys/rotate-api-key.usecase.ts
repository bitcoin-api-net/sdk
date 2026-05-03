import { ApiKey } from 'shared/generated/prisma/client.js';
import { ApiKeyRepository, apiKeyRepository } from '#src/repositories/api-key.repository.js';
import { CreateApiKeyUsecase, createApiKeyUsecase } from './create-api-key.usecase.js';

export type ExecuteParams = {
  userId: string;
  apiKeyId: string;
};

export class RotateApiKeyUsecase {
  constructor(
    private readonly apiKeyRepository: ApiKeyRepository,
    private readonly createApiKeyUsecase: CreateApiKeyUsecase,
  ) {}

  async execute({ userId, apiKeyId }: ExecuteParams): Promise<ApiKey> {
    const existing: ApiKey = await this.apiKeyRepository.findFirstOrThrow({ where: { id: apiKeyId, userId } });
    await this.apiKeyRepository.deleteById(apiKeyId);
    return this.createApiKeyUsecase.execute({ userId, name: existing.name });
  }
}

export const rotateApiKeyUsecase = new RotateApiKeyUsecase(apiKeyRepository, createApiKeyUsecase);
