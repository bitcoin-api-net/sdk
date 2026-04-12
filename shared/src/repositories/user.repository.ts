import { BaseRepository } from './base.repository.js';
import { PrismaClient, prismaClient } from './client.js';

export class UserRepository extends BaseRepository<PrismaClient['user']> {}

export const userRepository = new UserRepository(prismaClient.user);
