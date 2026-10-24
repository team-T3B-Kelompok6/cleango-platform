import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import {
  deleteScheduleById,
  findSchedule,
  insertSchedule,
  listSchedules,
  updateScheduleById,
} from '../model/schedule.model.js';
import { positiveId, requiredText } from './resource-validation.js';

export async function getSchedules(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.status(200).json({ data: await listSchedules() });
  } catch (error) {
    next(error);
  }
}

export async function getSchedule(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await findSchedule(positiveId(request.params.id, 'ID jadwal'));
    if (!data) throw new AppError(404, 'Jadwal tidak ditemukan.');
    response.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function createSchedule(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = request.body as Record<string, unknown>;
    const date = requiredText(body, 'date', 'Tanggal', 10, false);
    const time = requiredText(body, 'time', 'Jam shift', 40, false);
    const staff = requiredText(body, 'staff', 'Petugas', 120, false);
    const status = requiredText(body, 'status', 'Status', 40, false);
    const data = await insertSchedule({ date: date!, time: time!, staff: staff!, status: status! });
    response.status(201).json({ message: 'Jadwal berhasil dibuat.', data });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_TIME')
      next(new AppError(400, 'Jam shift tidak valid.', 'VALIDATION_ERROR'));
    else if (error instanceof Error && error.message === 'STAFF_NOT_FOUND')
      next(new AppError(400, 'Petugas tidak ditemukan.', 'VALIDATION_ERROR'));
    else next(error);
  }
}

export async function updateSchedule(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = request.body as Record<string, unknown>;
    const input: { date?: string; time?: string; staff?: string; status?: string } = {};
    const date = requiredText(body, 'date', 'Tanggal', 10, true);
    if (date !== undefined) input.date = date;
    const time = requiredText(body, 'time', 'Jam shift', 40, true);
    if (time !== undefined) input.time = time;
    const staff = requiredText(body, 'staff', 'Petugas', 120, true);
    if (staff !== undefined) input.staff = staff;
    const status = requiredText(body, 'status', 'Status', 40, true);
    if (status !== undefined) input.status = status;
    const data = await updateScheduleById(positiveId(request.params.id, 'ID jadwal'), input);
    if (!data) throw new AppError(404, 'Jadwal tidak ditemukan.');
    response.status(200).json({ message: 'Jadwal berhasil diperbarui.', data });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_TIME')
      next(new AppError(400, 'Jam shift tidak valid.', 'VALIDATION_ERROR'));
    else if (error instanceof Error && error.message === 'STAFF_NOT_FOUND')
      next(new AppError(400, 'Petugas tidak ditemukan.', 'VALIDATION_ERROR'));
    else next(error);
  }
}

export async function deleteSchedule(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!(await deleteScheduleById(positiveId(request.params.id, 'ID jadwal'))))
      throw new AppError(404, 'Jadwal tidak ditemukan.');
    response.status(200).json({ message: 'Jadwal berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
}
