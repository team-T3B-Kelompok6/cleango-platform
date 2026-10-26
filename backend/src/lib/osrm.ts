import { getEnv } from '../config/env.js';
import { AppError } from './AppError.js';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteSnapshot {
  distanceMeters: number;
  durationSeconds: number;
  path: [number, number][];
}

interface OsrmResponse {
  code?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: [number, number][] };
  }>;
}

export async function getRoute(
  origin: Coordinate,
  destination: Coordinate,
): Promise<RouteSnapshot> {
  const base = getEnv().OSRM_BASE_URL.replace(/\/$/, '');
  const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const url = `${base}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`;
  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(8_000),
      headers: { 'User-Agent': 'CleanGo-Academic/1.0 (ETA demo)' },
    });
  } catch {
    throw new AppError(
      502,
      'Layanan rute OSRM tidak dapat dihubungi.',
      'ROUTING_UNAVAILABLE',
    );
  }
  if (!response.ok) {
    throw new AppError(
      502,
      'Layanan rute OSRM gagal menghitung rute.',
      'ROUTING_FAILED',
    );
  }
  let payload: OsrmResponse;
  try {
    const value: unknown = await response.json();
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('Invalid route');
    payload = value as OsrmResponse;
  } catch {
    throw new AppError(
      502,
      'Respons rute OSRM tidak valid.',
      'INVALID_ROUTING_RESPONSE',
    );
  }
  const route = payload.routes?.[0];
  const distance = Number(route?.distance);
  const duration = Number(route?.duration);
  const coordinatesPath = route?.geometry?.coordinates;
  if (
    payload.code !== 'Ok' ||
    typeof route?.distance !== 'number' ||
    !Number.isFinite(distance) ||
    distance < 0 ||
    typeof route?.duration !== 'number' ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !Array.isArray(coordinatesPath) ||
    !coordinatesPath.length ||
    !coordinatesPath.every(
      (point) =>
        Array.isArray(point) &&
        point.length >= 2 &&
        typeof point[0] === 'number' &&
        Number.isFinite(point[0]) &&
        Math.abs(point[0]) <= 180 &&
        typeof point[1] === 'number' &&
        Number.isFinite(point[1]) &&
        Math.abs(point[1]) <= 90,
    )
  ) {
    throw new AppError(
      502,
      'Respons rute OSRM tidak valid.',
      'INVALID_ROUTING_RESPONSE',
    );
  }
  return {
    distanceMeters: distance,
    durationSeconds: duration,
    path: coordinatesPath.map(([longitude, latitude]) => [latitude, longitude]),
  };
}
