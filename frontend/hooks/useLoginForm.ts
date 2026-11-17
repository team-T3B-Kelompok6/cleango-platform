import { loginAction } from '@/app/actions';
import { useActionState, useState } from 'react';

/** State form login: nilai aksi server dan visibilitas kata sandi. */
export function useLoginForm() {
  const [state, formAction] = useActionState(loginAction, {});
  const [showPassword, setShowPassword] = useState(false);

  return {
    state,
    formAction,
    showPassword,
    togglePassword: () => setShowPassword((visible) => !visible),
  };
}
