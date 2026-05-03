import { ApiKey } from '#prisma/client.js';
import { BaseRepository } from './base.repository.js';
import { PrismaClient, prismaClient } from './client.js';
import type { ApiKeyAuthInfo } from './api-key.repository/types.js';

export class ApiKeyRepository extends BaseRepository<PrismaClient['apiKey']> {
  async findByToken(token: string): Promise<ApiKeyAuthInfo | undefined> {
    const apiKey = await this.model.findUnique({
      where: { token },
      select: { id: true, userId: true, isActive: true },
    });
    return apiKey ?? undefined;
  }

  async findById(id: string): Promise<ApiKey | undefined> {
    const apiKey = await this.model.findUnique({ where: { id } });
    return apiKey ?? undefined;
  }

  async listByUserId(userId: string): Promise<ApiKey[]> {
    return this.model.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async createKey(data: { userId: string; token: string; name: string }): Promise<ApiKey> {
    return this.model.create({ data });
  }

  async setActive(id: string, isActive: boolean): Promise<ApiKey> {
    return this.model.update({ where: { id }, data: { isActive } });
  }

  async deleteById(id: string): Promise<ApiKey> {
    return this.model.delete({ where: { id } });
  }
}

export const apiKeyRepository = new ApiKeyRepository(prismaClient.apiKey);
