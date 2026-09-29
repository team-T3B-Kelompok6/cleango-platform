import type { Request, Response } from 'express';
import { catalogService } from '../services/catalog.service.js';
import { sendList, sendSuccess } from '../utils/response.js';

export const catalogController = {
  async categories(_request: Request, response: Response) {
    return sendSuccess(response, await catalogService.categories());
  },
  async services(request: Request, response: Response) {
    const result = await catalogService.services(request.query as never);
    return sendList(response, result.items, result.pagination);
  },
  async serviceById(request: Request, response: Response) {
    return sendSuccess(response, await catalogService.serviceById(request.params.id as string));
  },
};
