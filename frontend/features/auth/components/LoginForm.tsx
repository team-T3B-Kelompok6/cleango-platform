'use client';

import { useLoginForm } from '../hooks/useLoginForm';
import { LoginCard } from './LoginCard';
import { LoginFields } from './LoginFields';

/** Perangkai: state dari hook, markup dari `LoginFields`. */
export function LoginForm() {
  const { state, submit, isPending, showPassword, togglePassword } =
    useLoginForm();

  return (
    <LoginCard>
      <LoginFields
        state={state}
        isPending={isPending}
        showPassword={showPassword}
        onTogglePassword={togglePassword}
        onSubmit={submit}
      />
    </LoginCard>
  );
}
