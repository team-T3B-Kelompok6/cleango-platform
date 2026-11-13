import { Router } from 'express';
import { AppError } from '../../lib/AppError.js';
import { registerPushDevice, unregisterPushDevice } from '../../model/customer-push-device.model.js';
import { authenticate, requireCustomer } from '../../middleware/auth.middleware.js';

function isValidToken(token: unknown): token is string {
  if (typeof token !== 'string') return false;
  const len = token.length;
  if (len < 32 || len > 4096) return false;
  for (let i = 0; i < len; i++) {
    const ch = token.charCodeAt(i);
    if (ch < 0x21 || ch > 0x7e) return false;
  }
  return true;
}

function validateBody(body: unknown, allowPlatform: boolean) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(400, 'Body harus berupa objek.', 'INVALID_BODY');
  }
  const allowed = new Set<string>(['token']);
  if (allowPlatform) allowed.add('platform');
  const obj = body as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      throw new AppError(400, 'Field tidak dikenali.', 'INVALID_FIELD');
    }
  }
  if (!isValidToken(obj.token)) {
    throw new AppError(400, 'Token tidak valid.', 'INVALID_TOKEN');
  }
  if (allowPlatform && obj.platform !== undefined && obj.platform !== 'android') {
    throw new AppError(400, 'Platform harus android.', 'INVALID_PLATFORM');
  }
  return { token: obj.token as string, ...(obj.platform !== undefined ? { platform: obj.platform as string } : {}) };
}

export const customerPushDeviceRouter = Router();
customerPushDeviceRouter.use(authenticate, requireCustomer);

customerPushDeviceRouter.post('/', async (req, res, next) => {
  try {
    validateBody(req.body, true);
    const userId = (req as { user?: { id?: unknown } }).user?.id;
    if (typeof userId !== 'number' || !Number.isSafeInteger(userId) || userId <= 0) {
      throw new AppError(401, 'Identitas tidak ada.', 'IDENTITY_MISSING');
    }
    await registerPushDevice(userId, (req.body as { token: string }).token);
    res.json({ success: true });
  } catch (err) {
    // Database errors can contain SQL parameters, including device tokens.
    next(err instanceof AppError ? err : new AppError(503, 'Registrasi perangkat tidak tersedia.', 'PUSH_DEVICE_UNAVAILABLE'));
  }
});

customerPushDeviceRouter.delete('/', async (req, res, next) => {
  try {
    validateBody(req.body, false);
    const userId = (req as { user?: { id?: unknown } }).user?.id;
    if (typeof userId !== 'number' || !Number.isSafeInteger(userId) || userId <= 0) {
      throw new AppError(401, 'Identitas tidak ada.', 'IDENTITY_MISSING');
    }
    await unregisterPushDevice(userId, (req.body as { token: string }).token);
    res.json({ success: true });
  } catch (err) {
    // Database errors can contain SQL parameters, including device tokens.
    next(err instanceof AppError ? err : new AppError(503, 'Registrasi perangkat tidak tersedia.', 'PUSH_DEVICE_UNAVAILABLE'));
  }
});