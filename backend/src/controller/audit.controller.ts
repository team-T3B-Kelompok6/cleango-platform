import type { Request, Response } from 'express';
import { listAudit } from '../model/audit.model.js';
import { pool } from '../lib/db.js';

export async function getAuditLogs(request: Request, response: Response): Promise<void> {
  const text = (value: unknown) => (typeof value === 'string' ? value : undefined);
  const query: {
    q?: string;
    adminId?: string;
    action?: string;
    from?: string;
    to?: string;
    page: number;
  } = { page: Number(text(request.query.page) ?? 1) };
  const q = text(request.query.q);
  const adminId = text(request.query.adminId);
  const action = text(request.query.action);
  const from = text(request.query.from);
  const to = text(request.query.to);
  if (q !== undefined) query.q = q;
  if (adminId !== undefined) query.adminId = adminId;
  if (action !== undefined) query.action = action;
  if (from !== undefined) query.from = from;
  if (to !== undefined) query.to = to;
  response.json(await listAudit(pool, query));
}
