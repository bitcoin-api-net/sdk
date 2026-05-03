import { ApiKeyRepository, apiKeyRepository } from '#src/repositories/api-key.repository.js';

export type ExecuteParams = {
  userId: string;
  apiKeyId: string;
};

export class DeleteApiKeyUsecase {
  constructor(private readonly apiKeyRepository: ApiKeyRepository) {}

  async execute({ userId, apiKeyId }: ExecuteParams): Promise<void> {
    await this.apiKeyRepository.findFirstOrThrow({ where: { id: apiKeyId, userId } });
    await this.apiKeyRepository.deleteById(apiKeyId);
  }
}

export const deleteApiKeyUsecase = new DeleteApiKeyUsecase(apiKeyRepository);
