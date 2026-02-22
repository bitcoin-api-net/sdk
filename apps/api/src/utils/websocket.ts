import { AppError } from 'lib/src/errors.js';
import { validator } from 'lib/src/validation.js';

export function sendJSON(
  socket: WebSocket,
  data: Record<string, unknown>,
  validationFn: ReturnType<typeof validator.compile>
) {
  const isValid = validationFn(data);
  if (isValid) {
    socket.send(JSON.stringify(data));
  } else {
    throw new AppError('Invalid response', 'INVALID_RESPONSE', { data, errors: validationFn.errors });
  }
}
