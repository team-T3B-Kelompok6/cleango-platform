import type { NextFunction, Request, Response } from 'express';
import { predictEta } from '../lib/ai-eta.js';
import { predictRisk } from '../lib/ai-risk.js';
import { predictWorkDuration } from '../lib/ai-work-duration.js';
import { AppError } from '../lib/AppError.js';
import { getRoute, type Coordinate } from '../lib/osrm.js';

function numberField(
  body: Record<string, unknown>,
  name: string,
  options: { min?: number; max?: number; fallback?: number } = {},
): number {
  const raw = body[name] ?? options.fallback;
  const value = Number(raw);
  if (
    raw === undefined ||
    !Number.isFinite(value) ||
    (options.min !== undefined && value < options.min) ||
    (options.max !== undefined && value > options.max)
  ) {
    throw new AppError(400, `${name} tidak valid.`, 'INVALID_TRACKING_INPUT');
  }
  return value;
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

function stringField(body: Record<string, unknown>, name: string): string {
  const value = body[name];
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(400, `${name} tidak valid.`, 'INVALID_TRACKING_INPUT');
  }
  return value.trim();
}

function isPlausibleEta(predictedSeconds: number, baselineSeconds: number) {
  if (!Number.isFinite(predictedSeconds) || predictedSeconds <= 0) return false;
  const ratio = predictedSeconds / baselineSeconds;
  return ratio >= 0.5 && ratio <= 1.5;
}

type RiskLevel = 'low' | 'medium' | 'high';

interface TrackingCalculation {
  cleaner: Coordinate;
  destination: Coordinate;
  distanceMeters: number;
  baselineEtaSeconds: number;
  etaSeconds: number;
  etaSource: 'ml' | 'osrm_fallback';
  etaModelVersion: string | null;
  initialDistanceM: number;
  elapsedSeconds: number;
  stoppedDurationSeconds: number;
  rollingSpeedMps: number;
  expectedSpeedMps: number;
  requestedAt: string;
  path: [number, number][];
}

async function calculateTracking(
  body: Record<string, unknown>,
): Promise<TrackingCalculation> {
  const cleaner = coordinate(body, 'cleaner');
  const destination = coordinate(body, 'destination');
  const route = await getRoute(cleaner, destination);
  const initialDistanceM = numberField(body, 'initialDistanceM', {
    min: 1,
    fallback: Math.max(1, route.distanceMeters),
  });
  const elapsedSeconds = numberField(body, 'elapsedSeconds', {
    min: 0,
    fallback: 0,
  });
  const stoppedDurationSeconds = numberField(body, 'stoppedDurationSeconds', {
    min: 0,
    fallback: 0,
  });
  const expectedSpeedMps = Math.max(
    0.1,
    route.distanceMeters / route.durationSeconds,
  );
  const rollingSpeedMps = numberField(body, 'rollingSpeedMps', {
    min: 0,
    fallback: expectedSpeedMps,
  });
  const requestedAt =
    typeof body.predictionAt === 'string' &&
    !Number.isNaN(Date.parse(body.predictionAt))
      ? new Date(body.predictionAt).toISOString()
      : new Date().toISOString();

  let prediction: Awaited<ReturnType<typeof predictEta>> | null = null;
  try {
    prediction = await predictEta({
      prediction_at: requestedAt,
      baseline_eta_seconds: route.durationSeconds,
      elapsed_seconds: elapsedSeconds,
      stopped_duration_seconds: stoppedDurationSeconds,
      remaining_distance_m: route.distanceMeters,
      initial_distance_m: Math.max(initialDistanceM, route.distanceMeters),
      rolling_speed_mps: rollingSpeedMps,
      expected_route_speed_mps: expectedSpeedMps,
    });
  } catch {
    prediction = null;
  }

  const useModel = Boolean(
    prediction?.model_better_than_baseline &&
    isPlausibleEta(prediction.eta_seconds, route.durationSeconds),
  );
  return {
    cleaner,
    destination,
    distanceMeters: route.distanceMeters,
    baselineEtaSeconds: route.durationSeconds,
    etaSeconds: useModel ? prediction!.eta_seconds : route.durationSeconds,
    etaSource: useModel ? 'ml' : 'osrm_fallback',
    etaModelVersion: useModel ? prediction!.model_version : null,
    initialDistanceM: Math.max(initialDistanceM, route.distanceMeters),
    elapsedSeconds,
    stoppedDurationSeconds,
    rollingSpeedMps,
    expectedSpeedMps,
    requestedAt,
    path: route.path,
  };
}

function ruleRisk(
  tracking: TrackingCalculation,
  secondsToSchedule: number,
  hasDeparted: boolean,
  locationAgeSeconds: number,
): { level: RiskLevel; late: boolean; reason: string } {
  const predictedLateness = tracking.etaSeconds - secondsToSchedule;
  if (secondsToSchedule <= 0)
    return {
      level: 'high',
      late: true,
      reason: 'Jadwal kedatangan sudah terlewati.',
    };
  if (!hasDeparted && secondsToSchedule <= 1_800)
    return {
      level: 'high',
      late: true,
      reason: 'Cleaner belum berangkat saat jadwal kurang dari 30 menit.',
    };
  if (!hasDeparted)
    return predictedLateness > 0
      ? {
          level: 'medium',
          late: true,
          reason: 'Cleaner belum berangkat dan durasi rute melewati jadwal.',
        }
      : {
          level: 'low',
          late: false,
          reason:
            'Cleaner belum berangkat, tetapi waktu menuju jadwal masih cukup.',
        };
  if (locationAgeSeconds >= 600)
    return {
      level: 'high',
      late: true,
      reason: 'Lokasi cleaner belum diperbarui selama 10 menit atau lebih.',
    };
  if (locationAgeSeconds >= 300)
    return {
      level: 'medium',
      late: predictedLateness > 0,
      reason: 'Lokasi cleaner belum diperbarui selama 5 menit atau lebih.',
    };
  if (predictedLateness > 600)
    return {
      level: 'high',
      late: true,
      reason: 'ETA melewati jadwal lebih dari 10 menit.',
    };
  if (predictedLateness > 0)
    return {
      level: 'medium',
      late: true,
      reason: 'ETA diperkirakan melewati jadwal.',
    };
  return {
    level: 'low',
    late: false,
    reason: 'ETA masih berada sebelum jadwal.',
  };
}

function recommendation(level: RiskLevel): string {
  if (level === 'high') return 'Hubungi cleaner dan siapkan opsi pengganti.';
  if (level === 'medium')
    return 'Pantau lokasi dan hubungi cleaner bila tidak bergerak.';
  return 'Lanjutkan pemantauan perjalanan.';
}

export async function calculateEta(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = request.body as Record<string, unknown>;
    const tracking = await calculateTracking(body);
    response.status(200).json({
      data: {
        cleaner: tracking.cleaner,
        destination: tracking.destination,
        distanceMeters: Math.round(tracking.distanceMeters),
        baselineEtaSeconds: Math.round(tracking.baselineEtaSeconds),
        etaSeconds: Math.round(tracking.etaSeconds),
        etaMinutes: Math.max(1, Math.round(tracking.etaSeconds / 60)),
        source: tracking.etaSource,
        modelVersion: tracking.etaModelVersion,
        path: tracking.path,
        updatedAt: new Date().toISOString(),
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
    const body = request.body as Record<string, unknown>;
    if (
      typeof body.scheduledAt !== 'string' ||
      Number.isNaN(Date.parse(body.scheduledAt))
    ) {
      throw new AppError(
        400,
        'scheduledAt tidak valid.',
        'INVALID_TRACKING_INPUT',
      );
    }
    if (typeof body.hasDeparted !== 'boolean')
      throw new AppError(
        400,
        'hasDeparted harus berupa boolean.',
        'INVALID_TRACKING_INPUT',
      );

    const tracking = await calculateTracking(body);
    const secondsToSchedule =
      (Date.parse(body.scheduledAt) - Date.parse(tracking.requestedAt)) / 1_000;
    const hasDeparted = body.hasDeparted === true;
    const locationAgeSeconds = numberField(body, 'locationAgeSeconds', {
      min: 0,
    });
    const fallback = ruleRisk(
      tracking,
      secondsToSchedule,
      hasDeparted,
      locationAgeSeconds,
    );
    const useOperationalRule =
      secondsToSchedule <= 0 || !hasDeparted || locationAgeSeconds >= 300;

    let prediction: Awaited<ReturnType<typeof predictRisk>> | null = null;
    if (!useOperationalRule) {
      try {
        prediction = await predictRisk({
          prediction_at: tracking.requestedAt,
          eta_seconds: tracking.etaSeconds,
          baseline_eta_seconds: tracking.baselineEtaSeconds,
          seconds_to_schedule: secondsToSchedule,
          elapsed_seconds: tracking.elapsedSeconds,
          stopped_duration_seconds: tracking.stoppedDurationSeconds,
          remaining_distance_m: tracking.distanceMeters,
          initial_distance_m: tracking.initialDistanceM,
          rolling_speed_mps: tracking.rollingSpeedMps,
          expected_route_speed_mps: tracking.expectedSpeedMps,
          location_age_seconds: locationAgeSeconds,
          has_departed: hasDeparted,
        });
      } catch {
        prediction = null;
      }
    }

    const riskLevel = prediction?.risk_level ?? fallback.level;
    response.status(200).json({
      data: {
        lateProbability: prediction?.late_probability ?? null,
        latePrediction: prediction?.late_prediction ?? fallback.late,
        riskLevel,
        source: prediction ? 'ml' : 'rule_fallback',
        reason: prediction
          ? `Model memperkirakan peluang terlambat ${Math.round(prediction.late_probability * 100)}%.`
          : fallback.reason,
        recommendation: recommendation(riskLevel),
        etaSeconds: Math.round(tracking.etaSeconds),
        etaSource: tracking.etaSource,
        baselineEtaSeconds: Math.round(tracking.baselineEtaSeconds),
        secondsToSchedule: Math.round(secondsToSchedule),
        predictedLatenessSeconds: Math.round(
          tracking.etaSeconds - secondsToSchedule,
        ),
        modelVersion: prediction?.model_version ?? null,
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
    const body = request.body as Record<string, unknown>;
    const startedAt = stringField(body, 'startedAt');
    if (Number.isNaN(Date.parse(startedAt))) {
      throw new AppError(
        400,
        'startedAt tidak valid.',
        'INVALID_TRACKING_INPUT',
      );
    }

    const input = {
      service_type: stringField(body, 'serviceType'),
      district: stringField(body, 'district'),
      size_unit: stringField(body, 'sizeUnit'),
      area_m2: numberField(body, 'areaM2', { min: 0, max: 10_000 }),
      item_count: numberField(body, 'itemCount', { min: 0, max: 1_000 }),
      cleaner_count: numberField(body, 'cleanerCount', { min: 1, max: 50 }),
      condition_level: numberField(body, 'conditionLevel', { min: 1, max: 3 }),
      add_on_count: numberField(body, 'addOnCount', { min: 0, max: 100 }),
      started_at: new Date(startedAt).toISOString(),
      sop_base_minutes: numberField(body, 'sopBaseMinutes', {
        min: 5,
        max: 1_440,
      }),
      scheduled_duration_minutes: numberField(
        body,
        'scheduledDurationMinutes',
        { min: 5, max: 1_440 },
      ),
    };

    let prediction: Awaited<ReturnType<typeof predictWorkDuration>> | null =
      null;
    try {
      prediction = await predictWorkDuration(input);
    } catch {
      prediction = null;
    }

    const fallbackCompletedAt = new Date(
      Date.parse(input.started_at) + input.scheduled_duration_minutes * 60_000,
    ).toISOString();
    response.status(200).json({
      data: {
        estimatedDurationMinutes:
          prediction?.estimated_duration_minutes ??
          input.scheduled_duration_minutes,
        estimatedCompletedAt:
          prediction?.estimated_completed_at ?? fallbackCompletedAt,
        source: prediction?.source ?? 'backend_sop_fallback',
        modelName: prediction?.model_name ?? null,
        modelVersion: prediction?.model_version ?? null,
        productionReady: prediction?.production_ready ?? false,
        warning:
          prediction?.warning ??
          'Layanan AI tidak tersedia; estimasi memakai durasi layanan.',
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}
