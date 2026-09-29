import type { Request, Response } from 'express';
import { addressService } from '../services/address.service.js';
import { requestAuth } from '../utils/request-auth.js';
import { sendSuccess } from '../utils/response.js';

export const addressController = {
  async list(request: Request, response: Response) {
    return sendSuccess(response, await addressService.list(requestAuth(request)));
  },
  async find(request: Request, response: Response) {
    return sendSuccess(response, await addressService.find(requestAuth(request), request.params.id as string));
  },
  async create(request: Request, response: Response) {
    return sendSuccess(response, await addressService.create(requestAuth(request), request.body), 'Address created', 201);
  },
  async update(request: Request, response: Response) {
    return sendSuccess(response, await addressService.update(requestAuth(request), request.params.id as string, request.body), 'Address updated');
  },
  async remove(request: Request, response: Response) {
    await addressService.remove(requestAuth(request), request.params.id as string);
    return sendSuccess(response, null, 'Address deleted');
  },
};
