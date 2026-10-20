import { getEnv } from '../config/env.js';

export interface WorkDurationModelInput {
  service_type: string;
  district: string;
  size_unit: string;
  area_m2: number;
  item_count: number;
  cleaner_count: number;
  condition_level: number;
  add_on_count: number;
  started_at: string;
  sop_base_minutes: number;
  scheduled_duration_minutes: number;
}

export interface WorkDurationModelPrediction {
  estimated_duration_minutes: number;
  estimated_completed_at: string;
  source: 'ml_demo' | 'sop_fallback' | 'sop_fallback_unknown_service';
  model_name: string;
  model_version: string;
  production_ready: boolean;
  warning: string;
}

export async function predictWorkDuration(
  input: WorkDurationModelInput,
): Promise<WorkDurationModelPrediction> {
  const env = getEnv();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (env.AI_SERVICE_TOKEN)
    headers.Authorization = `Bearer ${env.AI_SERVICE_TOKEN}`;

  const response = await fetch(
    `${env.AI_SERVICE_URL.replace(/\/$/, '')}/predict/work-duration`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(3_000),
    },
  );
  if (!response.ok) throw new Error(`AI service returned ${response.status}`);
  const payload = (await response.json()) as {
    data?: Partial<WorkDurationModelPrediction>;
  };
  const data = payload.data;
  if (
    !data ||
    !Number.isFinite(data.estimated_duration_minutes) ||
    typeof data.estimated_completed_at !== 'string' ||
    Number.isNaN(Date.parse(data.estimated_completed_at)) ||
    typeof data.source !== 'string' ||
    typeof data.model_version !== 'string' ||
    typeof data.production_ready !== 'boolean'
  ) {
    throw new Error('AI service returned an invalid work-duration response');
  }
  return data as WorkDurationModelPrediction;
}
