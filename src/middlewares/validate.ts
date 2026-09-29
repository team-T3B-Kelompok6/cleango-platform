import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../utils/app-error.js';

type RequestPart = 'body' | 'params' | 'query';

export function validate(schema: ZodType, part: RequestPart = 'body'): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request[part]);
    if (!result.success) {
      next(new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', result.error.flatten()));
      return;
    }
    request[part] = result.data;
    next();
  };
}
