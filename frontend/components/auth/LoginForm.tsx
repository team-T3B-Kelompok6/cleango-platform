'use client';
import { useLoginForm } from '@/hooks/useLoginForm';
import { Form } from './Form';
import { FormWrapper } from './FormWrapper';

export function LoginForm() {
  const { state, formAction, showPassword, togglePassword } = useLoginForm();

  return (
    <FormWrapper>
      <Form
        state={state}
        formAction={formAction}
        showPassword={showPassword}
        onTogglePassword={togglePassword}
      />
    </FormWrapper>
  );
}
