import { PrismaClient } from '#prisma/client.js';
import env, { required } from '../env.js';
import { PrismaPg } from '@prisma/adapter-pg';

const DATABASE_URL = required(env.DATABASE_URL);

export { PrismaClient };

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
export const prismaClient = new PrismaClient({ adapter });

export async function connectToDb() {
  await prismaClient.$connect();
}

export async function disconnectFromDb() {
  await prismaClient.$disconnect();
}
