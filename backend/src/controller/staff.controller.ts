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
const statuses: StaffStatus[] = [
  'Tersedia',
  'Bertugas',
  'Masa Training',
  'Nonaktif',
];
function inputFrom(
  body: Record<string, unknown>,
  partial: boolean,
): Partial<StaffInput> {
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
  const area = requiredText(body, 'area', 'Wilayah kerja', 120, partial);
  if (name !== undefined) input.name = name;
  if (phone !== undefined) input.phone = phone;
  if (area !== undefined) input.area = area;
  if (status !== undefined) input.status = status;
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
      inputFrom(request.body as Record<string, unknown>, false) as StaffInput,
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
    const data = await updateStaffById(
      positiveId(request.params.id, 'ID petugas'),
      inputFrom(request.body as Record<string, unknown>, true),
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
