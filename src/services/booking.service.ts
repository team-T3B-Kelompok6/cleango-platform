import { bookingRepository } from '../repositories/booking.repository.js';
import type { AuthContext, BookingInput } from '../types/domain.js';
import { AppError } from '../utils/app-error.js';

export const bookingService = {
  async create(auth: AuthContext, input: BookingInput) {
    const { data, error } = await bookingRepository.create(auth.accessToken, input);
    if (error) throw error;
    return data;
  },
  async list(auth: AuthContext, query: { page: number; limit: number; status?: string }) {
    const { data, error, count } = await bookingRepository.list(
      auth.accessToken, auth.userId, query.page, query.limit, query.status,
    );
    if (error) throw error;
    return {
      items: data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / query.limit),
      },
    };
  },
  async detail(auth: AuthContext, id: string) {
    const { data, error } = await bookingRepository.detail(auth.accessToken, auth.userId, id);
    if (error) throw error;
    if (!data) throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
    return data;
  },
  async active(auth: AuthContext) {
    const { data, error } = await bookingRepository.active(auth.accessToken, auth.userId);
    if (error) throw error;
    return data;
  },
  async cancel(auth: AuthContext, id: string) {
    const { data, error } = await bookingRepository.cancel(auth.accessToken, id);
    if (error) throw error;
    return data;
  },
};
