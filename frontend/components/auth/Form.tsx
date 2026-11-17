'use client';
import type { FormState } from '@/types';
import { Icon } from '@/components/shared/ui/Icon';
import { UiIcon } from '@/components/shared/ui/UiIcon';
import { Button } from '@/components/shared/ui/Button';
import { Input } from '@/components/shared/ui/Input';
import { Label } from '@/components/shared/ui/Label';
import { LOGIN_COPY, LOGIN_FIELDS } from './data';

export function Form({
  state,
  formAction,
  showPassword,
  onTogglePassword,
}: {
  state: FormState;
  formAction: (formData: FormData) => void;
  showPassword: boolean;
  onTogglePassword: () => void;
}) {
  return (
    <form action={formAction} className="mt-24 flex flex-col gap-18">
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
