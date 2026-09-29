import { authRepository } from '../repositories/auth.repository.js';
import { AppError } from '../utils/app-error.js';

function assertAuthResult(error: { message: string } | null): void {
  if (error) throw new AppError(400, 'AUTH_ERROR', error.message);
}

export const authService = {
  async register(input: { email: string; password: string; fullName: string; phone?: string }) {
    const { data, error } = await authRepository.register(input.email, input.password, input.fullName, input.phone);
    assertAuthResult(error);
    return { user: data.user, session: data.session };
  },
  async login(input: { email: string; password: string }) {
    const { data, error } = await authRepository.login(input.email, input.password);
    if (error) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
    return data;
  },
  async forgotPassword(email: string) {
    const { error } = await authRepository.forgotPassword(email);
    assertAuthResult(error);
    return null;
  },
  async logout(accessToken: string) {
    const { error } = await authRepository.logout(accessToken);
    assertAuthResult(error);
    return null;
  },
  async me(accessToken: string, userId: string) {
    const { data, error } = await authRepository.profile(accessToken, userId);
    if (error || !data) throw new AppError(404, 'PROFILE_NOT_FOUND', 'Profile not found');
    return data;
  },
};
