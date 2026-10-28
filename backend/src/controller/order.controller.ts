import type { RowDataPacket } from 'mysql2';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import { OrderStatusTransitionError } from '../lib/order-status.js';
import { pool } from '../lib/db.js';
import {
  deleteBookingById,
  findOrder,
  insertBooking,
  listOrders,
  updateBookingById,
} from '../model/order.model.js';
import { positiveId, requiredText } from './resource-validation.js';
import { ORDER_STATUSES } from '../model/order.model.js';

export async function getOrders(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.status(200).json({ data: await listOrders() });
  } catch (error) {
    next(error);
  }
}

export async function getOrder(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await findOrder(positiveId(request.params.id, 'ID pesanan'));
    if (!data) throw new AppError(404, 'Pesanan tidak ditemukan.');
    response.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

function inputFrom(
  body: Record<string, unknown>,
  partial: boolean,
): {
  customerName?: string;
  serviceName?: string;
  date?: string;
  time?: string;
  price?: number;
  status?: string;
  notes?: string;
  phone?: string;
  address?: string;
  staff?: string[];
} {
  const input: ReturnType<typeof inputFrom> = {};
  const customer = requiredText(body, 'customer', 'Nama pelanggan', 120, partial);
  if (customer !== undefined) input.customerName = customer;
  const service = requiredText(body, 'service', 'Layanan', 150, partial);
  if (service !== undefined) input.serviceName = service;
  const date = requiredText(body, 'date', 'Tanggal', 10, partial);
  if (date !== undefined) input.date = date;
  const time = requiredText(body, 'time', 'Jam pengerjaan', 40, partial);
  if (time !== undefined) input.time = time;
  const notes = requiredText(body, 'notes', 'Catatan', 2000, partial);
  if (notes !== undefined) input.notes = notes;

  if (body.address !== undefined) {
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    if (address.length > 3000)
      throw new AppError(
        400,
        'Periksa kembali data yang dikirim.',
        'VALIDATION_ERROR',
        { address: 'Maksimal 3000 karakter.' },
      );
    input.address = address;
  }

  if (body.phone !== undefined) {
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    if (phone && !/^[0-9+()\-\s]{6,30}$/.test(phone))
      throw new AppError(
        400,
        'Periksa kembali data yang dikirim.',
        'VALIDATION_ERROR',
        { phone: 'Nomor telepon tidak valid.' },
      );
    input.phone = phone;
  }

  if (body.staff !== undefined) {
    if (!Array.isArray(body.staff) || body.staff.length > 1)
      throw new AppError(
        400,
        'Periksa kembali data yang dikirim.',
        'VALIDATION_ERROR',
        { staff: 'Pilih satu petugas per pesanan.' },
      );
    if (body.staff.some((name) => typeof name !== 'string'))
      throw new AppError(
        400,
        'Periksa kembali data yang dikirim.',
        'VALIDATION_ERROR',
        { staff: 'Nama petugas tidak valid.' },
      );
    input.staff = [...new Set(body.staff.map((name) => name.trim()))].filter(
      Boolean,
    );
  }

  if (!partial || body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0)
      throw new AppError(400, 'Periksa kembali data yang dikirim.', 'VALIDATION_ERROR', {
        price: 'Biaya harus berupa angka nol atau lebih.',
      });
    input.price = price;
  }
  if (!partial || body.status !== undefined) {
    const status = body.status;
    if (typeof status !== 'string' || !ORDER_STATUSES.includes(status))
      throw new AppError(400, 'Periksa kembali data yang dikirim.', 'VALIDATION_ERROR', {
        status: 'Status pesanan tidak valid.',
      });
    input.status = status;
  }
  return input;
}

export async function createOrder(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = request.body as Record<string, unknown>;
    const input = inputFrom(body, false);
    const customerId = await findCustomerByName(input.customerName!);
    const data = await insertBooking({
      customerId,
      customerName: input.customerName!,
      serviceName: input.serviceName!,
      date: input.date!,
      time: input.time!,
      price: input.price!,
      status: input.status!,
      notes: input.notes ?? '',
    });
    response.status(201).json({ message: 'Pesanan berhasil dibuat.', data });
  } catch (error) {
    next(error);
  }
}

async function findCustomerByName(name: string): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM users WHERE role = 'customer' AND name = ? LIMIT 1",
    [name],
  );
  if (!rows[0])
    throw new AppError(400, 'Periksa kembali data yang dikirim.', 'VALIDATION_ERROR', {
      customer: 'Pelanggan tidak ditemukan.',
    });
  return Number(rows[0].id);
}

export async function updateOrder(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = request.body as Record<string, unknown>;
    const data = await updateBookingById(
      positiveId(request.params.id, 'ID pesanan'),
      inputFrom(body, true),
      { type: 'admin', userId: request.user?.id ?? null },
    );
    if (!data) throw new AppError(404, 'Pesanan tidak ditemukan.');
    response.status(200).json({ message: 'Pesanan berhasil diperbarui.', data });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNKNOWN_STATUS')
      next(
        new AppError(400, 'Status pesanan tidak dikenal.', 'VALIDATION_ERROR', {
          status: 'Pilih status yang tersedia.',
        }),
      );
    else if (error instanceof OrderStatusTransitionError)
      next(
        new AppError(
          409,
          'Status pesanan tidak boleh kembali ke tahap sebelumnya.',
          'ORDER_STATUS_BACKWARDS',
          { status: `Dari ${error.from} ke ${error.to} tidak diizinkan.` },
        ),
      );
    else if (error instanceof Error && error.message === 'STAFF_NOT_FOUND')
      next(
        new AppError(400, 'Petugas tidak ditemukan.', 'VALIDATION_ERROR', {
          staff: 'Perbarui pilihan petugas.',
        }),
      );
    else if (error instanceof Error && error.message === 'STAFF_LIMIT')
      next(
        new AppError(400, 'Terlalu banyak petugas.', 'VALIDATION_ERROR', {
          staff: 'Pilih satu petugas per pesanan.',
        }),
      );
    else if (
      error instanceof Error &&
      error.message === 'STAFF_ACTOR_REQUIRED'
    )
      next(new AppError(401, 'Authentication diperlukan', 'AUTH_REQUIRED'));
    else next(error);
  }
}

export async function deleteOrder(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await deleteBookingById(
      positiveId(request.params.id, 'ID pesanan'),
    );
    if (result === 'not_found')
      throw new AppError(404, 'Pesanan tidak ditemukan.');
    if (result === 'not_finished')
      throw new AppError(
        409,
        'Pesanan belum selesai. Selesaikan atau batalkan pesanan sebelum menghapus.',
        'ORDER_NOT_FINISHED',
      );
    response.status(200).json({ message: 'Pesanan berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
}

