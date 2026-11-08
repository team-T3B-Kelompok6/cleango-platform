import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import {
  deleteStaffById,
  findStaff,
  insertStaff,
  listStaff,
  updateStaffById,
  type StaffInput,
  type StaffStatus,
} from '../model/staff.model.js';
import {
  positiveId,
  requiredText,
  requireChanges,
  validationError,
} from './resource-validation.js';
import { findServices } from '../model/service.model.js';
const statuses: StaffStatus[] = [
  'Tersedia',
  'Bertugas',
  'Masa Training',
  'Nonaktif',
];
const MAX_SKILLS = 20;
const MAX_SKILL_LENGTH = 150;

function photoUrlValue(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string')
    validationError({ photoUrl: 'Foto petugas tidak valid.' });
  const url = value.trim();
  const local = /^\/(?!\/)[^\s\\]*$/.test(url);
  const remote = /^https?:\/\/\S+$/.test(url);
  if (!local && !remote)
    validationError({
      photoUrl:
        'Alamat foto harus berupa tautan http/https atau path yang diawali /.',
    });
  if (url.length > 500)
    validationError({ photoUrl: 'Alamat foto terlalu panjang.' });
  return url;
}

async function skillsValue(value: unknown): Promise<string[]> {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string'))
    validationError({ skills: 'Keahlian petugas tidak valid.' });
  const skills = [
    ...new Set((value as string[]).map((item) => item.trim()).filter(Boolean)),
  ];
  if (skills.length > MAX_SKILLS)
    validationError({ skills: `Maksimal ${MAX_SKILLS} keahlian.` });
  if (skills.some((skill) => skill.length > MAX_SKILL_LENGTH))
    validationError({
      skills: `Setiap keahlian maksimal ${MAX_SKILL_LENGTH} karakter.`,
    });
  if (!skills.length) return [];
  const available = (
    await findServices({ search: null, categoryId: null, activeOnly: true })
  ).map((service) => service.name);
  if (skills.some((skill) => !available.includes(skill)))
    validationError({
      skills: 'Daftar layanan sudah berubah. Pilih kembali keahlian petugas.',
    });
  return skills;
}
async function wouldCreateCycle(
  selfId: number,
  trainerId: number,
): Promise<boolean> {
  let current: number | null = trainerId;
  const seen = new Set<number>();
  while (current !== null) {
    if (current === selfId) return true;
    if (seen.has(current)) return true;
    seen.add(current);
    const trainer = await findStaff(current);
    if (!trainer || trainer.trainerId === null) break;
    current = Number(trainer.trainerId);
  }
  return false;
}
async function inputFrom(
  body: Record<string, unknown>,
  partial: boolean,
  currentStatus?: StaffStatus,
  selfId?: number,
): Promise<Partial<StaffInput>> {
  let status: StaffStatus | undefined;
  if (!partial || body.status !== undefined) {
    if (
      typeof body.status !== 'string' ||
      !statuses.includes(body.status as StaffStatus)
    )
      validationError({ status: 'Status petugas tidak valid.' });
    status = body.status as StaffStatus;
  }
  const input: Partial<StaffInput> = {};
  const name = requiredText(body, 'name', 'Nama petugas', 120, partial);
  const phone = requiredText(body, 'phone', 'Nomor WhatsApp', 30, partial);
  const area =
    !partial && body.area === undefined
      ? 'Malang'
      : requiredText(body, 'area', 'Wilayah kerja', 120, partial);
  if (name !== undefined) input.name = name;
  if (phone !== undefined) input.phone = phone;
  if (area !== undefined) input.area = area;
  if (status !== undefined) input.status = status;
  if (!partial || body.photoUrl !== undefined)
    input.photoUrl = photoUrlValue(body.photoUrl);
  if (!partial || body.skills !== undefined)
    input.skills = await skillsValue(body.skills);

  const effectiveStatus = status ?? currentStatus;
  if (effectiveStatus !== undefined) {
    if (effectiveStatus !== 'Masa Training') {
      if (
        body.trainerId !== undefined &&
        body.trainerId !== null &&
        body.trainerId !== ''
      ) {
        validationError({
          trainerId: 'Mentor hanya untuk petugas Masa Training.',
        });
      }
      if (
        partial &&
        status !== undefined &&
        currentStatus === 'Masa Training'
      ) {
        input.trainerId = null;
      }
    } else {
      if (body.trainerId !== undefined) {
        if (body.trainerId === null || body.trainerId === '') {
          input.trainerId = null;
        } else {
          const trainerId = positiveId(body.trainerId, 'Mentor');
          if (selfId !== undefined && trainerId === selfId) {
            validationError({
              trainerId: 'Petugas tidak bisa menjadi mentor dirinya sendiri.',
            });
          }
          const trainer = await findStaff(trainerId);
          if (!trainer)
            validationError({ trainerId: 'Mentor tidak ditemukan.' });
          if (!['Tersedia', 'Bertugas'].includes(trainer.status)) {
            validationError({
              trainerId:
                'Mentor harus petugas aktif non-training (Tersedia atau Bertugas).',
            });
          }
          if (
            selfId !== undefined &&
            (await wouldCreateCycle(selfId, trainerId))
          ) {
            validationError({
              trainerId: 'Mentor membentuk siklus pelatihan.',
            });
          }
          input.trainerId = trainerId;
        }
      }
    }
  } else if (body.trainerId !== undefined) {
    validationError({
      trainerId: 'Mentor hanya untuk petugas Masa Training.',
    });
  }

  if (partial) requireChanges(input);
  return input;
}
export async function getStaffList(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.status(200).json({ data: await listStaff() });
  } catch (error) {
    next(error);
  }
}
export async function getStaff(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await findStaff(positiveId(request.params.id, 'ID petugas'));
    if (!data) throw new AppError(404, 'Petugas tidak ditemukan.');
    response.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}
export async function createStaff(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await insertStaff(
      (await inputFrom(
        request.body as Record<string, unknown>,
        false,
      )) as StaffInput,
    );
    response.status(201).json({ message: 'Petugas berhasil dibuat.', data });
  } catch (error) {
    next(error);
  }
}
export async function updateStaff(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = positiveId(request.params.id, 'ID petugas');
    const current = await findStaff(id);
    if (!current) throw new AppError(404, 'Petugas tidak ditemukan.');
    const data = await updateStaffById(
      id,
      await inputFrom(
        request.body as Record<string, unknown>,
        true,
        current.status,
        id,
      ),
    );
    if (!data) throw new AppError(404, 'Petugas tidak ditemukan.');
    response
      .status(200)
      .json({ message: 'Petugas berhasil diperbarui.', data });
  } catch (error) {
    next(error);
  }
}
export async function deleteStaff(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!(await deleteStaffById(positiveId(request.params.id, 'ID petugas'))))
      throw new AppError(404, 'Petugas tidak ditemukan.');
    response.status(200).json({ message: 'Petugas berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
}
