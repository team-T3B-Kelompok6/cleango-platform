export type TrackingPoint = [number, number];
export interface TrackingPerson {
  id: string;
  name: string;
  area: string;
  phone: string;
  orderId: string;
  customer: string;
  service: string;
  address: string;
  start: TrackingPoint;
  destination: TrackingPoint;
  minutesToSchedule: number;
  stage: number;
  updated: string;
  stale?: boolean;
}
export interface EtaSnapshot {
  distanceMeters: number;
  baselineEtaSeconds: number;
  etaSeconds: number;
  etaMinutes: number;
  source: 'ml' | 'osrm_fallback';
  modelVersion: string | null;
  updatedAt: string;
}
export interface RiskSnapshot {
  lateProbability: number | null;
  latePrediction: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  source: 'ml' | 'rule_fallback';
  reason: string;
  recommendation: string;
  etaSeconds: number;
  etaSource: 'ml' | 'osrm_fallback';
  baselineEtaSeconds: number;
  secondsToSchedule: number;
  predictedLatenessSeconds: number;
  modelVersion: string | null;
  updatedAt: string;
}
export const trackingSteps = [
  'Ditugaskan',
  'Berangkat',
  'Tiba di lokasi',
  'Mulai bekerja',
  'Selesai',
] as const;
export const trackingStatuses = [
  'Ditugaskan',
  'Di perjalanan',
  'Sudah tiba',
  'Sedang bekerja',
  'Selesai',
] as const;
export function trackingPosition(person: TrackingPerson): TrackingPoint {
  const progress = person.stage >= 2 ? 1 : person.stage === 1 ? 0.45 : 0;
  return [
    person.start[0] + (person.destination[0] - person.start[0]) * progress,
    person.start[1] + (person.destination[1] - person.start[1]) * progress,
  ];
}
