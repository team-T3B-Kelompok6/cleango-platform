import { createPublicClient, createUserClient, getServiceClient } from '../config/supabase.js';

export const authRepository = {
  register(email: string, password: string, fullName: string, phone?: string) {
    return createPublicClient().auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, ...(phone ? { phone } : {}) } },
    });
  },
  login(email: string, password: string) {
    return createPublicClient().auth.signInWithPassword({ email, password });
  },
  forgotPassword(email: string) {
    return createPublicClient().auth.resetPasswordForEmail(email);
  },
  logout(accessToken: string) {
    return getServiceClient().auth.admin.signOut(accessToken, 'local');
  },
  profile(accessToken: string, userId: string) {
    return createUserClient(accessToken)
      .from('profiles')
      .select('id, full_name, phone, avatar_url, role, created_at, updated_at')
      .eq('id', userId)
      .single();
  },
};
