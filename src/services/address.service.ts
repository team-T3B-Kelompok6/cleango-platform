import { addressRepository } from '../repositories/address.repository.js';
import type { AddressInput, AuthContext } from '../types/domain.js';
import { AppError } from '../utils/app-error.js';

function ensureData<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw error;
  if (!data) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found');
  return data;
}

export const addressService = {
  async list(auth: AuthContext) {
    const { data, error } = await addressRepository.list(auth.accessToken, auth.userId);
    if (error) throw error;
    return data;
  },
  async find(auth: AuthContext, id: string) {
    const { data, error } = await addressRepository.find(auth.accessToken, auth.userId, id);
    return ensureData(data, error);
  },
  async create(auth: AuthContext, input: AddressInput) {
    const { data, error } = await addressRepository.create(auth.accessToken, auth.userId, input);
    return ensureData(data, error);
  },
  async update(auth: AuthContext, id: string, input: Partial<AddressInput>) {
    const { data, error } = await addressRepository.update(auth.accessToken, auth.userId, id, input);
    return ensureData(data, error);
  },
  async remove(auth: AuthContext, id: string) {
    const { data, error } = await addressRepository.remove(auth.accessToken, auth.userId, id);
    ensureData(data, error);
    return null;
  },
};
