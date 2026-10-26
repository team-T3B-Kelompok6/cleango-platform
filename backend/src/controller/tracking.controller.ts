import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import { getRoute, type Coordinate } from '../lib/osrm.js';
import { estimateWorkCompletion } from '../lib/work-estimate.js';
import { findCustomerTask, stageOf } from '../model/cleaner-task.model.js';
import { positiveId } from './resource-validation.js';

function numberField(
  body: Record<string, unknown>,
  name: string,
  options: {
    min?: number;
    max?: number;
    fallback?: number;
    integer?: boolean;
  } = {},
): number {
  const value = body[name] === undefined ? options.fallback : body[name];
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    (options.integer && !Number.isInteger(value)) ||
    (options.min !== undefined && value < options.min) ||
    (options.max !== undefined && value > options.max)
  ) {
    throw new AppError(400, `${name} tidak valid.`, 'INVALID_TRACKING_INPUT');
  }
  return value;
}

function bodyOf(request: Request): Record<string, unknown> {
  if (
    !request.body ||
    typeof request.body !== 'object' ||
    Array.isArray(request.body)
  )
    throw new AppError(
      400,
      'Data estimasi harus berupa objek.',
      'INVALID_TRACKING_INPUT',
    );
  return request.body;
}

function timestamp(value: unknown, name: string): string {
  if (
    typeof value !== 'string' ||
    !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ||
    Number.isNaN(Date.parse(value))
  )
    throw new AppError(
      400,
      `${name} harus berupa waktu ISO dengan zona waktu.`,
      'INVALID_TRACKING_INPUT',
    );
  return new Date(value).toISOString();
}

function coordinate(
  body: Record<string, unknown>,
  prefix: 'cleaner' | 'destination',
): Coordinate {
  return {
    latitude: numberField(body, `${prefix}Latitude`, { min: -90, max: 90 }),
    longitude: numberField(body, `${prefix}Longitude`, { min: -180, max: 180 }),
  };
}

async function calculateTracking(body: Record<string, unknown>) {
  const cleaner = coordinate(body, 'cleaner');
  const destination = coordinate(body, 'destination');
  const requestedAt =
    body.predictionAt === undefined
      ? new Date().toISOString()
      : timestamp(body.predictionAt, 'predictionAt');
  const route = await getRoute(cleaner, destination);
  return { cleaner, destination, route, requestedAt };
}

type RiskLevel = 'low' | 'medium' | 'high';
function recommendation(level: RiskLevel): string {
  if (level === 'high')
    return 'Hubungi cleaner dan periksa apakah perlu petugas pengganti.';
  if (level === 'medium')
    return 'Pantau perjalanan dan konfirmasi kondisi cleaner.';
  return 'Lanjutkan pemantauan perjalanan.';
}

export async function calculateEta(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { cleaner, destination, route } = await calculateTracking(
      bodyOf(request),
    );
    response.status(200).json({
      data: {
        cleaner,
        destination,
        distanceMeters: Math.round(route.distanceMeters),
        baselineEtaSeconds: Math.ceil(route.durationSeconds),
        etaSeconds: Math.ceil(route.durationSeconds),
        etaMinutes: Math.max(1, Math.ceil(route.durationSeconds / 60)),
        source: 'osrm',
        // Kept null for older clients; no model is loaded or called.
        modelVersion: null,
        calculationVersion: 'route-v1',
        path: route.path,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

// Coordinates come from the owned booking, never from a customer's demo map.
export async function getCustomerEta(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!request.user)
      throw new AppError(401, 'Silakan masuk kembali.', 'AUTH_REQUIRED');
    const row = await findCustomerTask(
      request.user.id,
      positiveId(request.params.id, 'ID pesanan'),
    );
    if (!row)
      throw new AppError(
        404,
        'Data perjalanan pesanan belum tersedia.',
        'TRACKING_NOT_READY',
      );
    if (
      stageOf(row) !== 'en_route' ||
      !['en_route', 'departed'].includes(row.orderStatus) ||
      row.linkStatus !== 'active' ||
      new Date(row.linkExpiresAt).getTime() <= Date.now()
    )
      throw new AppError(
        409,
        'ETA tersedia saat cleaner sedang menuju lokasi.',
        'TRACKING_NOT_READY',
      );
    const gpsTime =
      row.locationUpdatedAt == null
        ? NaN
        : new Date(row.locationUpdatedAt).getTime();
    const age = (Date.now() - gpsTime) / 1000;
    if (!Number.isFinite(age) || age < 0 || age >= 300)
      throw new AppError(
        409,
        'Lokasi cleaner belum tersedia atau sudah usang. Menunggu pembaruan GPS.',
        'TRACKING_NOT_READY',
      );
    const { cleaner, destination, route, requestedAt } =
      await calculateTracking({
        cleanerLatitude: row.latitude,
        cleanerLongitude: row.longitude,
        destinationLatitude: row.destinationLatitude,
        destinationLongitude: row.destinationLongitude,
      });
    const seconds = Math.ceil(route.durationSeconds);
    response.status(200).json({
      data: {
        orderId: String(row.bookingId),
        cleaner,
        destination,
        distanceMeters: Math.round(route.distanceMeters),
        baselineEtaSeconds: seconds,
        etaSeconds: seconds,
        etaMinutes: Math.max(1, Math.ceil(seconds / 60)),
        estimatedArrivalAt: new Date(
          Date.parse(requestedAt) + seconds * 1000,
        ).toISOString(),
        locationUpdatedAt: new Date(gpsTime).toISOString(),
        source: 'osrm',
        modelVersion: null,
        calculationVersion: 'route-v1',
        path: route.path,
        updatedAt: requestedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function calculateRisk(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = bodyOf(request);
    const scheduledAt = timestamp(body.scheduledAt, 'scheduledAt');
    if (typeof body.hasDeparted !== 'boolean')
      throw new AppError(
        400,
        'hasDeparted harus berupa boolean.',
        'INVALID_TRACKING_INPUT',
      );
    const age = numberField(body, 'locationAgeSeconds', { min: 0 });
    const { route, requestedAt } = await calculateTracking(body);
    const etaSeconds = Math.ceil(route.durationSeconds);
    const secondsToSchedule =
      (Date.parse(scheduledAt) - Date.parse(requestedAt)) / 1000;
    const lateness = etaSeconds - secondsToSchedule;
    let level: RiskLevel =
      lateness > 600 ? 'high' : lateness > 0 ? 'medium' : 'low';
    let reason =
      lateness > 0
        ? `Perkiraan tiba melewati jadwal sekitar ${Math.ceil(lateness / 60)} menit.`
        : 'Waktu perjalanan masih cukup untuk tiba sesuai jadwal.';
    let late: boolean | null = lateness > 0;
    if (secondsToSchedule < 0) {
      level = 'high';
      reason =
        'Jadwal kedatangan sudah terlewati; konfirmasi status kedatangan cleaner.';
    } else if (!body.hasDeparted && secondsToSchedule <= etaSeconds + 300) {
      level = lateness > 600 ? 'high' : 'medium';
      reason =
        'Cleaner belum berangkat dan sisa waktu mendekati durasi rute. Konfirmasi keberangkatan.';
    }
    if (body.hasDeparted && age >= 300) {
      level = age >= 600 || level === 'high' ? 'high' : 'medium';
      reason =
        'Lokasi cleaner belum diperbarui. Risiko perlu diperiksa; GPS lama bukan bukti cleaner terlambat atau tidak hadir.';
      late = null;
    }
    response.status(200).json({
      data: {
        lateProbability: null,
        latePrediction: late,
        riskLevel: level,
        source: 'schedule_rule',
        reason,
        recommendation: recommendation(level),
        etaSeconds,
        etaSource: 'osrm',
        baselineEtaSeconds: etaSeconds,
        secondsToSchedule: Math.round(secondsToSchedule),
        predictedLatenessSeconds: Math.max(0, Math.ceil(lateness)),
        modelVersion: null,
        calculationVersion: 'schedule-v1',
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function calculateWorkDuration(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = bodyOf(request);
    const startedAt = timestamp(body.startedAt, 'startedAt');
    const minutes = numberField(body, 'scheduledDurationMinutes', {
      min: 1,
      max: 1440,
      integer: true,
      ...(body.sopBaseMinutes === undefined
        ? {}
        : {
            fallback: numberField(body, 'sopBaseMinutes', {
              min: 1,
              max: 1440,
              integer: true,
            }),
          }),
    });
    // Older callers may send these fields; validate them but do not invent SOP multipliers.
    for (const [field, min, max] of [
      ['areaM2', 0, 10000],
      ['itemCount', 0, 1000],
      ['cleanerCount', 1, 50],
      ['conditionLevel', 1, 3],
      ['addOnCount', 0, 100],
    ] as const) {
      if (body[field] !== undefined)
        numberField(body, field, { min, max, integer: field !== 'areaM2' });
    }
    response.status(200).json({
      data: {
        estimatedDurationMinutes: minutes,
        estimatedCompletedAt: estimateWorkCompletion(startedAt, minutes),
        source: 'service_duration',
        calculationVersion: 'service-duration-v1',
        modelName: null,
        modelVersion: null,
        warning:
          'Perkiraan berdasarkan durasi layanan, bukan jaminan selesai. Status selesai dikonfirmasi cleaner.',
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}
