import { getEnv } from '../config/env.js';

export interface RiskModelInput {
  prediction_at: string;
  eta_seconds: number;
  baseline_eta_seconds: number;
  seconds_to_schedule: number;
  elapsed_seconds: number;
  stopped_duration_seconds: number;
  remaining_distance_m: number;
  initial_distance_m: number;
  rolling_speed_mps: number;
  expected_route_speed_mps: number;
  location_age_seconds: number;
  has_departed: boolean;
}

export interface RiskModelPrediction {
  late_probability: number;
  late_prediction: boolean;
  risk_level: 'low' | 'medium' | 'high';
  predicted_lateness_seconds: number;
  decision_threshold: number;
  high_threshold: number;
  model_name: string;
  model_version: string;
  predicted_at: string;
  warning: string;
}

export async function predictRisk(
  input: RiskModelInput,
): Promise<RiskModelPrediction> {
  const env = getEnv();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (env.AI_SERVICE_TOKEN)
    headers.Authorization = `Bearer ${env.AI_SERVICE_TOKEN}`;
  const response = await fetch(
    `${env.AI_SERVICE_URL.replace(/\/$/, '')}/predict/risk`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(3_000),
    },
  );
  if (!response.ok) throw new Error(`AI service returned ${response.status}`);
  const payload = (await response.json()) as {
    data?: Partial<RiskModelPrediction>;
  };
  const data = payload.data;
  if (
    !data ||
    !Number.isFinite(data.late_probability) ||
    typeof data.late_prediction !== 'boolean' ||
    !['low', 'medium', 'high'].includes(data.risk_level ?? '') ||
    typeof data.model_version !== 'string'
  ) {
    throw new Error('AI service returned an invalid risk response');
  }
  return data as RiskModelPrediction;
}
