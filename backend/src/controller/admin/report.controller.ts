import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../lib/AppError.js';
import {
  detectRiskAlerts,
  getReportSummary,
  listRiskAlerts,
  updateAlertStatus,
  type AlertStatus,
} from '../../model/report.model.js';

const ALERT_STATUSES: AlertStatus[] = ['open', 'acknowledged', 'resolved'];

function isoDay(value: unknown, field: string): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text))
    throw new AppError(400, 'Periksa kembali data yang dikirim.', 'VALIDATION_ERROR', {
      [field]: 'Gunakan format YYYY-MM-DD.',
    });
  return text;
}

function jakartaDay(offsetDays = 0): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(
    new Date(Date.now() + offsetDays * 86_400_000),
  );
}

function adminId(request: Request): number {
  if (!request.user)
    throw new AppError(401, 'Authentication diperlukan', 'AUTH_REQUIRED');
  return request.user.id;
}

function positiveId(value: unknown, label: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0)
    throw new AppError(400, 'Periksa kembali data yang dikirim.', 'VALIDATION_ERROR', {
      id: `${label} tidak valid.`,
    });
  return id;
}

export async function getSummary(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const to = request.query.to ? isoDay(request.query.to, 'to') : jakartaDay();
    const from = request.query.from
      ? isoDay(request.query.from, 'from')
      : jakartaDay(-29);
    if (from > to)
      throw new AppError(400, 'Periksa kembali data yang dikirim.', 'VALIDATION_ERROR', {
        from: 'Tanggal awal harus sebelum tanggal akhir.',
      });
    response.status(200).json({ data: await getReportSummary(from, to) });
  } catch (error) {
    next(error);
  }
}

export async function getAlerts(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const raw = typeof request.query.status === 'string' ? request.query.status : '';
    if (raw && !ALERT_STATUSES.includes(raw as AlertStatus))
      throw new AppError(400, 'Periksa kembali data yang dikirim.', 'VALIDATION_ERROR', {
        status: 'Status alert tidak valid.',
      });
    const created = await detectRiskAlerts();
    response.status(200).json({
      data: await listRiskAlerts((raw || undefined) as AlertStatus | undefined),
      meta: { created },
    });
  } catch (error) {
    next(error);
  }
}

async function markAlert(
  request: Request,
  response: Response,
  next: NextFunction,
  status: 'acknowledged' | 'resolved',
): Promise<void> {
  try {
    const updated = await updateAlertStatus(
      positiveId(request.params.id, 'ID alert'),
      status,
      adminId(request),
    );
    if (!updated) throw new AppError(404, 'Alert tidak ditemukan.');
    response.status(200).json({ message: 'Alert diperbarui.', data: updated });
  } catch (error) {
    next(error);
  }
}

export function acknowledgeAlert(request: Request, response: Response, next: NextFunction) {
  void markAlert(request, response, next, 'acknowledged');
}

export function resolveAlert(request: Request, response: Response, next: NextFunction) {
  void markAlert(request, response, next, 'resolved');
}
