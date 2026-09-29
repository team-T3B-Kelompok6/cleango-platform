import type { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { requestAuth } from '../utils/request-auth.js';
import { sendSuccess } from '../utils/response.js';

export const authController = {
  async register(request: Request, response: Response) {
    return sendSuccess(response, await authService.register(request.body), 'Registration successful', 201);
  },
  async login(request: Request, response: Response) {
    return sendSuccess(response, await authService.login(request.body), 'Login successful');
  },
  async forgotPassword(request: Request, response: Response) {
    await authService.forgotPassword(request.body.email);
    return sendSuccess(response, null, 'Password recovery email requested');
  },
  async logout(request: Request, response: Response) {
    await authService.logout(requestAuth(request).accessToken);
    return sendSuccess(response, null, 'Logout successful');
  },
  async me(request: Request, response: Response) {
    const auth = requestAuth(request);
    return sendSuccess(response, await authService.me(auth.accessToken, auth.userId));
  },
};
