'use client';

import type { FormEvent } from 'react';
import type { FormState } from '@/types';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { UiIcon } from '@/components/ui/UiIcon';
import { LOGIN_COPY, LOGIN_FIELDS } from '../data/authConstants';

/** Markup form login; seluruh state datang dari `useLoginForm`. */
export function LoginFields({
  state,
  isPending,
  showPassword,
  onTogglePassword,
  onSubmit,
}: {
  state: FormState;
  isPending: boolean;
  showPassword: boolean;
  onTogglePassword: () => void;
  onSubmit: (form: FormData) => void;
}) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget));
  };

  return (
    <form onSubmit={handleSubmit} className="mt-24 flex flex-col gap-18">
      <noscript>
        <p className="rounded-control bg-warning-surface px-12 py-10 text-base text-warning">
          {LOGIN_COPY.noScript}
        </p>
      </noscript>
      {LOGIN_FIELDS.map((field) => {
        const error = state.errors?.[field.name];
        const isPassword = field.name === 'password';
        return (
          <div key={field.name} className="flex flex-col gap-7">
            <Label htmlFor={field.name}>{field.label}</Label>
            <Input
              id={field.name}
              name={field.name}
              type={isPassword && !showPassword ? 'password' : 'text'}
              autoComplete={field.autoComplete}
              placeholder={field.placeholder}
              required
              defaultValue={
                isPassword
                  ? undefined
                  : String(state.values?.[field.name] ?? '')
              }
              invalid={!!error}
              icon={field.icon}
              trailing={
                isPassword ? (
                  <button
                    type="button"
                    onClick={onTogglePassword}
                    aria-label={
                      showPassword
                        ? LOGIN_COPY.hidePassword
                        : LOGIN_COPY.showPassword
                    }
                    className="absolute top-4 right-7 bottom-4 flex items-center text-[21px] text-ink-faint"
                  >
                    <UiIcon name={showPassword ? 'eyeOff' : 'eye'} />
                  </button>
                ) : undefined
              }
            />
            {error && <span className="text-xs text-danger">{error}</span>}
          </div>
        );
      })}
      <label className="my-[2px] flex cursor-pointer items-center gap-6 text-base text-ink-muted">
        <input
          name="remember"
          type="checkbox"
          className="size-[13px] accent-accent-bright"
        />
        {LOGIN_COPY.remember}
      </label>
      {state.message && (
        <p
          className="rounded-control bg-danger-soft px-12 py-10 text-base text-danger"
          role="alert"
        >
          {state.message}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        pending={isPending}
        pendingLabel={LOGIN_COPY.pending}
        className="w-full"
      >
        {LOGIN_COPY.submit}
        <span className="[&>img]:size-14 [&>img]:brightness-0 [&>img]:invert">
          <Icon name="arrow" />
        </span>
      </Button>
    </form>
  );
}
