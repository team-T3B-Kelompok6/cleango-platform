import { pool } from '../lib/db.js';
import { createHash } from 'node:crypto';

function hashToken(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

export async function registerPushDevice(userId: number, token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await pool.execute(
    `INSERT INTO customer_push_devices (user_id, token_hash, token, updated_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), token = VALUES(token), updated_at = NOW()`,
    [userId, tokenHash, token]
  );
}

export async function unregisterPushDevice(userId: number, token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await pool.execute(
    `DELETE FROM customer_push_devices WHERE user_id = ? AND token_hash = ?`,
    [userId, tokenHash]
  );
}

export async function listPushDevices(userId: number): Promise<string[]> {
  const [rows] = await pool.execute(
    `SELECT token FROM customer_push_devices WHERE user_id = ? ORDER BY updated_at DESC LIMIT 10`,
    [userId]
  );
  return (rows as { token: string }[]).map((row) => row.token);
}
