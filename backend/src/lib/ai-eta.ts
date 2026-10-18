import { getEnv } from '../config/env.js';

export interface EtaModelInput {
  prediction_at: string;
  baseline_eta_seconds: number;
  elapsed_seconds: number;
  stopped_duration_seconds: number;
  remaining_distance_m: number;
  initial_distance_m: number;
  rolling_speed_mps: number;
  expected_route_speed_mps: number;
}

export interface EtaModelPrediction {
  eta_seconds: number;
  eta_minutes: number;
  model_name: string;
  model_version: string;
  model_better_than_baseline: boolean;
  predicted_at: string;
  warning: string;
}

export async function predictEta(
  input: EtaModelInput,
): Promise<EtaModelPrediction> {
  const env = getEnv();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (env.AI_SERVICE_TOKEN)
    headers.Authorization = `Bearer ${env.AI_SERVICE_TOKEN}`;
  const response = await fetch(
    `${env.AI_SERVICE_URL.replace(/\/$/, '')}/predict/eta`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(3_000),
    },
  );
  if (!response.ok) throw new Error(`AI service returned ${response.status}`);
  const payload = (await response.json()) as {
    data?: Partial<EtaModelPrediction>;
  };
  const data = payload.data;
  if (
    !data ||
    !Number.isFinite(data.eta_seconds) ||
    typeof data.model_version !== 'string' ||
    typeof data.model_better_than_baseline !== 'boolean'
  ) {
    throw new Error('AI service returned an invalid response');
  }
  return data as EtaModelPrediction;
}
