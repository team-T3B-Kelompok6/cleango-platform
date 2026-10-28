import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { getEnv } from '../config/env.js';

function key(): Buffer {
  return createHash('sha256')
    .update(`${getEnv().JWT_SECRET}:cleaner-link-v1`)
    .digest();
}

/** Stores the link token reversibly so the admin board can rebuild the URL. */
export function encryptLinkToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}

export function decryptLinkToken(value: string | null): string | null {
  if (!value) return null;
  const [ivPart, tagPart, dataPart] = value.split('.');
  if (!ivPart || !tagPart || !dataPart) return null;
  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key(),
      Buffer.from(ivPart, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}
