import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../lib/AppError.js';
import {
  MAX_ADDRESSES_PER_CUSTOMER,
  countAddressesByUser,
  deleteAddressById,
  findAddressById,
  findAddressesByUser,
  insertAddress,
  updateAddressById,
  type AddressInput,
} from '../../model/address.model.js';

function customerId(request: Request): number {
  if (!request.user) throw new AppError(401, 'Authentication diperlukan', 'AUTH_REQUIRED');
  return request.user.id;
}

function addressId(value: unknown): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID alamat tidak valid');
  return id;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('62')) return '0' + digits.substring(2);
  if (!digits.startsWith('0')) return '0' + digits;
  return digits;
}

function requiredText(body: Record<string, unknown>, key: string, label: string, max: number): string {
  const value = typeof body[key] === 'string' ? (body[key] as string).trim() : '';
  if (!value) throw new AppError(400, `${label} wajib diisi`);
  if (value.length > max) throw new AppError(400, `${label} maksimal ${max} karakter`);
  return value;
}

function optionalCoordinate(value: unknown, label: string): number | null {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  if (Number.isNaN(num)) throw new AppError(400, `${label} tidak valid`);
  return num;
}

function parseInput(body: Record<string, unknown>): AddressInput {
  const recipientPhone = normalizePhone(requiredText(body, 'recipient_phone', 'Nomor penerima', 30));
  if (recipientPhone.length < 9 || recipientPhone.length > 15) {
    throw new AppError(400, 'Nomor penerima tidak valid');
  }
  const landmark = typeof body.landmark === 'string' ? body.landmark.trim() : '';
  const postalCode = typeof body.postal_code === 'string' ? body.postal_code.trim() : '';
  return {
    label: requiredText(body, 'label', 'Label alamat', 80),
    recipientName: requiredText(body, 'recipient_name', 'Nama penerima', 120),
    recipientPhone,
    streetAddress: requiredText(body, 'street_address', 'Alamat lengkap', 1000),
    city: typeof body.city === 'string' && body.city.trim() ? body.city.trim() : 'Malang',
    province: typeof body.province === 'string' && body.province.trim() ? body.province.trim() : 'Jawa Timur',
    postalCode: postalCode || null,
    landmark: landmark || null,
    latitude: optionalCoordinate(body.latitude, 'Latitude'),
    longitude: optionalCoordinate(body.longitude, 'Longitude'),
    isPrimary: body.is_primary === true,
  };
}

export async function listAddresses(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    response.status(200).json({ data: await findAddressesByUser(customerId(request)) });
  } catch (error) { next(error); }
}

export async function getAddress(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const address = await findAddressById(addressId(request.params.id), customerId(request));
    if (!address) throw new AppError(404, 'Alamat tidak ditemukan');
    response.status(200).json({ data: address });
  } catch (error) { next(error); }
}

export async function createAddress(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const userId = customerId(request);
    if (await countAddressesByUser(userId) >= MAX_ADDRESSES_PER_CUSTOMER) {
      throw new AppError(400, `Maksimal ${MAX_ADDRESSES_PER_CUSTOMER} alamat tersimpan`);
    }
    const address = await insertAddress(userId, parseInput(request.body as Record<string, unknown>));
    response.status(201).json({ message: 'Alamat berhasil ditambahkan', data: address });
  } catch (error) { next(error); }
}

export async function updateAddress(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const userId = customerId(request);
    const current = await findAddressById(addressId(request.params.id), userId);
    if (!current) throw new AppError(404, 'Alamat tidak ditemukan');

    const body = request.body as Record<string, unknown>;
    const input: Partial<AddressInput> = {};
    if (body.label !== undefined) input.label = requiredText(body, 'label', 'Label alamat', 80);
    if (body.recipient_name !== undefined) input.recipientName = requiredText(body, 'recipient_name', 'Nama penerima', 120);
    if (body.recipient_phone !== undefined) {
      const phone = normalizePhone(requiredText(body, 'recipient_phone', 'Nomor penerima', 30));
      if (phone.length < 9 || phone.length > 15) throw new AppError(400, 'Nomor penerima tidak valid');
      input.recipientPhone = phone;
    }
    if (body.street_address !== undefined) input.streetAddress = requiredText(body, 'street_address', 'Alamat lengkap', 1000);
    if (body.city !== undefined) input.city = String(body.city).trim() || 'Malang';
    if (body.province !== undefined) input.province = String(body.province).trim() || 'Jawa Timur';
    if (body.postal_code !== undefined) input.postalCode = String(body.postal_code).trim() || null;
    if (body.landmark !== undefined) input.landmark = String(body.landmark).trim() || null;
    if (body.latitude !== undefined) input.latitude = optionalCoordinate(body.latitude, 'Latitude');
    if (body.longitude !== undefined) input.longitude = optionalCoordinate(body.longitude, 'Longitude');
    if (body.is_primary !== undefined) input.isPrimary = body.is_primary === true;

    const address = await updateAddressById(current.id, userId, input);
    if (!address) throw new AppError(404, 'Alamat tidak ditemukan');
    response.status(200).json({ message: 'Alamat berhasil diperbarui', data: address });
  } catch (error) { next(error); }
}

export async function deleteAddress(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const removed = await deleteAddressById(addressId(request.params.id), customerId(request));
    if (!removed) throw new AppError(404, 'Alamat tidak ditemukan');
    response.status(200).json({ message: 'Alamat berhasil dihapus' });
  } catch (error) { next(error); }
}
