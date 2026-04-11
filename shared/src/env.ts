import dotenv from 'dotenv';
import assert from 'node:assert/strict';
import path from 'node:path';

const ENV_FILE = path.join(import.meta.dirname.split(path.sep).slice(0, -2).join(path.sep), '.env');

export function loadEnvs() {
  dotenv.config({ path: ENV_FILE, override: false });
  process.env.RUN_FILE_EXTENSION = getRunFileExtension();
}

export function required(variable?: string): string {
  assert(variable, 'Required variable is not set');
  return variable;
}

export function getRunFileExtension(): string {
  const scriptPath = process.argv[1];
  if (!scriptPath) {
    return '';
  }
  return path.extname(scriptPath);
}

loadEnvs();
export default process.env;
