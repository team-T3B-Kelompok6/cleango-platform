'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormState } from '@/types';
import { loginAction } from '../api/authActions';

/**
 * State form login: submit lewat TanStack Query mutation ke server action,
 * lalu navigasi ke dashboard saat sukses.
 *
 * @returns `state`, `submit`, `isPending`, `showPassword`, `togglePassword`
 */
export function useLoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const mutation = useMutation<FormState, Error, FormData>({
    mutationFn: (form) => loginAction({}, form),
    onSuccess: (state) => {
      if (!state.success) return;
      router.push('/');
      // Layout admin mengambil data baru; refresh memastikan RSC membaca cookie.
      router.refresh();
    },
  });

  return {
    state: mutation.data ?? {},
    submit: mutation.mutate,
    isPending: mutation.isPending,
    showPassword,
    togglePassword: () => setShowPassword((visible) => !visible),
  };
}
