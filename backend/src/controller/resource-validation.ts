import { AppError } from '../lib/AppError.js';

export function positiveId(value: unknown, label: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, `${label} tidak valid`, 'VALIDATION_ERROR');
  }
  return id;
}

export function validationError(errors: Record<string, string>): never {
  throw new AppError(
    400,
    'Periksa kembali data yang dikirim.',
    'VALIDATION_ERROR',
    errors,
  );
}

export function requiredText(
  body: Record<string, unknown>,
  field: string,
  label: string,
  maxLength: number,
  partial: boolean,
): string | undefined {
  if (partial && body[field] === undefined) return undefined;
  if (typeof body[field] !== 'string' || !body[field].trim()) {
    validationError({ [field]: `${label} wajib diisi.` });
  }
  const value = (body[field] as string).trim();
  if (value.length > maxLength)
    validationError({ [field]: `${label} maksimal ${maxLength} karakter.` });
  return value;
}

export function booleanValue(
  body: Record<string, unknown>,
  field: string,
  label: string,
  partial: boolean,
  defaultValue = true,
): boolean | undefined {
  if (partial && body[field] === undefined) return undefined;
  if (body[field] === undefined) return defaultValue;
  if (typeof body[field] !== 'boolean')
    validationError({ [field]: `${label} harus boolean.` });
  return body[field] as boolean;
}

export function requireChanges(input: object): void {
  if (Object.values(input).every((value) => value === undefined)) {
    throw new AppError(
      400,
      'Tidak ada data yang diperbarui.',
      'VALIDATION_ERROR',
    );
  }
}
