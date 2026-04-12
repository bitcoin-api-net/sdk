import { AppError } from 'shared/src/errors.js';

type ValidateFn = (data: unknown) => boolean;

export function sendJSON(socket: WebSocket, data: Record<string, unknown>, validateFn: ValidateFn & { errors?: unknown }) {
  const isValid = validateFn(data);
  if (isValid) {
    socket.send(JSON.stringify(data));
  } else {
    throw new AppError('Invalid response', { code: 'INVALID_RESPONSE', data: { data, errors: validateFn.errors } });
  }
}
