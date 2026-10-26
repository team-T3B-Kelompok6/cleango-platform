export interface RiskSnapshot {
  lateProbability: number | null;
  latePrediction: boolean | null;
  riskLevel: 'low' | 'medium' | 'high';
  source: 'schedule_rule';
  reason: string;
  recommendation: string;
  etaSeconds: number;
  etaSource: 'osrm';
  baselineEtaSeconds: number;
  secondsToSchedule: number;
  predictedLatenessSeconds: number;
  modelVersion: null;
  updatedAt: string;
}
