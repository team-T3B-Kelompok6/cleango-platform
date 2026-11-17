import type { FormState } from '@/types';

/** Galat server yang dikembalikan aksi form. */
export function FormFeedback({ state }: { state: FormState }) {
  return state.message ? (
    <p
      role="alert"
      className="mt-16 rounded-control bg-danger-soft p-10 text-sm leading-[1.6] text-danger"
    >
      {state.message}
    </p>
  ) : null;
}
