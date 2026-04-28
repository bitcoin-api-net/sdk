import crypto from 'node:crypto';
import { v7 as uuidV7 } from 'uuid';

export function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function uuid7(): string {
  return uuidV7();
}
