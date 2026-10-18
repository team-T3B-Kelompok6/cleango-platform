import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../lib/AppError.js';
import {
  deleteCustomerById,
  findCustomer,
  listCustomers,
  updateCustomerById,
} from '../../model/customer.model.js';
import { positiveId, requiredText, booleanValue } from '../resource-validation.js';

function customerId(value: unknown): number {
  return positiveId(value, 'ID customer');
}

export async function getCustomers(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.status(200).json({ data: await listCustomers() });
  } catch (error) {
    next(error);
  }
}

export async function getCustomer(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await findCustomer(customerId(request.params.id));
    if (!data) throw new AppError(404, 'Customer tidak ditemukan.');
    response.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function updateCustomer(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = request.body as Record<string, unknown>;
    const input: { name?: string; phone?: string; email?: string; active?: boolean } = {};
    const name = requiredText(body, 'name', 'Nama customer', 120, true);
    if (name !== undefined) input.name = name;
    const phone = requiredText(body, 'phone', 'Nomor WhatsApp', 30, true);
    if (phone !== undefined) input.phone = phone;
    const email = requiredText(body, 'email', 'Email', 190, true);
    if (email !== undefined) input.email = email;
    const active = booleanValue(body, 'active', 'Status akun', true);
    if (active !== undefined) input.active = active;
    const data = await updateCustomerById(customerId(request.params.id), input);
    if (!data) throw new AppError(404, 'Customer tidak ditemukan.');
    response.status(200).json({ message: 'Customer berhasil diperbarui.', data });
  } catch (error) {
    next(error);
  }
}

export async function deleteCustomer(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!(await deleteCustomerById(customerId(request.params.id))))
      throw new AppError(404, 'Customer tidak ditemukan.');
    response.status(200).json({ message: 'Customer berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
}
