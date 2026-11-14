import { AppError } from './AppError.js';

const cleanliness = ['light', 'moderate', 'heavy', 'unknown'] as const;
const tidiness = ['tidy', 'moderate', 'cluttered', 'unknown'] as const;
const observations = [
  'visible_dirt',
  'visible_clutter',
  'no_visible_dirt',
  'unclear',
] as const;
const confidence = ['low', 'medium', 'high'] as const;
const cleanlinessReason = [
  'no_visible_dirt', 'small_dirt_patches', 'widespread_dirt', 'dirt_buildup', 'unclear',
] as const;
const tidinessReason = [
  'items_organized', 'some_items_unarranged', 'many_items_unarranged', 'not_applicable', 'unclear',
] as const;
const observationLabels: Record<(typeof observations)[number], string> = {
  visible_dirt: 'Kotoran tampak pada foto.',
  visible_clutter: 'Barang tampak tidak tertata.',
  no_visible_dirt:
    'Tidak tampak kotoran jelas pada foto; bukan jaminan kebersihan.',
  unclear: 'Kondisi belum dapat dinilai dari foto.',
};

export interface PhotoAnalysis {
  cleanliness: (typeof cleanliness)[number];
  tidiness: (typeof tidiness)[number];
  observations: string;
  confidence: (typeof confidence)[number];
  cleanlinessReason?: (typeof cleanlinessReason)[number] | undefined;
  tidinessReason?: (typeof tidinessReason)[number] | undefined;
}

export const photoAnalysisSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['cleanliness', 'tidiness', 'observations', 'confidence'],
  properties: {
    cleanliness: { type: 'string', enum: cleanliness },
    tidiness: { type: 'string', enum: tidiness },
    observations: { type: 'string', enum: observations },
    confidence: { type: 'string', enum: confidence },
    cleanlinessReason: { type: 'string', enum: cleanlinessReason },
    tidinessReason: { type: 'string', enum: tidinessReason },
  },
};

export function parsePhotoAnalysis(value: unknown): PhotoAnalysis {
  const invalid = () =>
    new AppError(
      503,
      'Analisis foto belum tersedia. Coba lagi atau gunakan chat teks.',
      'VISION_INVALID_RESPONSE',
    );
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw invalid();
  const item = value as Record<string, unknown>;
  const allowedKeys = [
    ...photoAnalysisSchema.required,
    'cleanlinessReason',
    'tidinessReason',
  ];
  if (
    Object.keys(item).some((key) => !allowedKeys.includes(key)) ||
    photoAnalysisSchema.required.some((key) => !(key in item))
  )
    throw invalid();
  for (const [key, allowed] of Object.entries({
    cleanliness,
    tidiness,
    observations,
    confidence,
  }))
    if (
      typeof item[key] !== 'string' ||
      !(allowed as readonly string[]).includes(item[key] as string)
    )
      throw invalid();
  if (
    'cleanlinessReason' in item &&
    (typeof item.cleanlinessReason !== 'string' ||
      !(cleanlinessReason as readonly string[]).includes(
        item.cleanlinessReason as string,
      ))
  )
    throw invalid();
  if (
    'tidinessReason' in item &&
    (typeof item.tidinessReason !== 'string' ||
      !(tidinessReason as readonly string[]).includes(
        item.tidinessReason as string,
      ))
  )
    throw invalid();
  return {
    cleanliness: item.cleanliness as PhotoAnalysis['cleanliness'],
    tidiness: item.tidiness as PhotoAnalysis['tidiness'],
    observations:
      observationLabels[item.observations as (typeof observations)[number]],
    confidence: item.confidence as PhotoAnalysis['confidence'],
    ...(item.cleanlinessReason
      ? {
          cleanlinessReason:
            item.cleanlinessReason as PhotoAnalysis['cleanlinessReason'],
        }
      : {}),
    ...(item.tidinessReason
      ? {
          tidinessReason:
            item.tidinessReason as PhotoAnalysis['tidinessReason'],
        }
      : {}),
  };
}

export function photoAnalysisResult(analysis: PhotoAnalysis) {
  const dirtReasonMatches = analysis.cleanlinessReason === undefined || {
    light: ['no_visible_dirt', 'small_dirt_patches'],
    moderate: ['widespread_dirt'],
    heavy: ['dirt_buildup'],
    unknown: ['unclear'],
  }[analysis.cleanliness].includes(analysis.cleanlinessReason);
  const dirtObservationMatches =
    !(analysis.observations === observationLabels.no_visible_dirt &&
      (analysis.cleanliness === 'moderate' || analysis.cleanliness === 'heavy' ||
        (analysis.cleanlinessReason !== undefined && analysis.cleanlinessReason !== 'no_visible_dirt'))) &&
    !(analysis.observations === observationLabels.visible_dirt && analysis.cleanlinessReason === 'no_visible_dirt');
  const tidinessReasonMatches = analysis.tidinessReason === undefined || {
    tidy: ['items_organized'],
    moderate: ['some_items_unarranged'],
    cluttered: ['many_items_unarranged'],
    unknown: ['not_applicable', 'unclear'],
  }[analysis.tidiness].includes(analysis.tidinessReason);
  if (!tidinessReasonMatches) analysis = { ...analysis, tidiness: 'unknown', tidinessReason: 'unclear' };
  const dirtEvidence =
    analysis.observations === observationLabels.visible_dirt &&
    (analysis.cleanlinessReason === undefined ||
      analysis.cleanlinessReason === 'small_dirt_patches' ||
      analysis.cleanlinessReason === 'widespread_dirt' ||
      analysis.cleanlinessReason === 'dirt_buildup') &&
    analysis.cleanliness !== 'unknown';
  const noDirtEvidence =
    analysis.observations === observationLabels.no_visible_dirt &&
    analysis.cleanlinessReason === 'no_visible_dirt' &&
    analysis.cleanliness === 'light';
  const confidenceSupported =
    analysis.confidence === 'high' ||
    (analysis.confidence === 'medium' && (dirtEvidence || noDirtEvidence));
  const needsClarification =
    !confidenceSupported ||
    !dirtReasonMatches ||
    !dirtObservationMatches ||
    analysis.cleanliness === 'unknown' ||
    analysis.cleanlinessReason === 'unclear' ||
    analysis.observations === observationLabels.unclear;
  const safeAnalysis = needsClarification
    ? {
        ...analysis,
        cleanliness: 'unknown' as const,
        tidiness: 'unknown' as const,
        ...(analysis.cleanlinessReason !== undefined ? { cleanlinessReason: 'unclear' as const } : {}),
        ...(analysis.tidinessReason !== undefined && analysis.tidinessReason !== 'not_applicable' ? { tidinessReason: 'unclear' as const } : {}),
      }
    : analysis;
  return {
    status: needsClarification
      ? ('needs_clarification' as const)
      : ('analyzed' as const),
    reply: needsClarification
      ? 'Boo belum cukup yakin menilai kekotoran dari bukti yang terlihat. Ini tidak selalu berarti foto kurang jelas. Coba sudut lebih dekat pada permukaan yang ingin dinilai.'
      : analysis.confidence === 'medium'
        ? 'Perkiraan dari bagian yang terlihat; hasil masih tentatif dan bisa keliru.'
        : 'Foto menunjukkan kondisi cukup jelas. Penilaian ini hanya berdasarkan bagian yang terlihat.',
    analysis: safeAnalysis,
  };
}
