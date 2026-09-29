import type { Request, Response } from 'express';
import { bookingService } from '../services/booking.service.js';
import { requestAuth } from '../utils/request-auth.js';
import { sendList, sendSuccess } from '../utils/response.js';

export const bookingController = {
  async create(request: Request, response: Response) {
    return sendSuccess(response, await bookingService.create(requestAuth(request), request.body), 'Booking created', 201);
  },
  async list(request: Request, response: Response) {
    const result = await bookingService.list(requestAuth(request), request.query as never);
    return sendList(response, result.items, result.pagination);
  },
  async active(request: Request, response: Response) {
    return sendSuccess(response, await bookingService.active(requestAuth(request)));
  },
  async detail(request: Request, response: Response) {
    return sendSuccess(response, await bookingService.detail(requestAuth(request), request.params.id as string));
  },
  async cancel(request: Request, response: Response) {
    return sendSuccess(response, await bookingService.cancel(requestAuth(request), request.params.id as string), 'Booking cancelled');
  },
};
