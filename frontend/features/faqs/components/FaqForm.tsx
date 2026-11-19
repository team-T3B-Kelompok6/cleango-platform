'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import type { FormState, RecordData } from '@/types';
import {
  Button,
  DialogBody,
  DialogFooter,
  buttonVariants,
  SubmitButton,
} from '@/components/ui';
import { useDialogClose } from '@/components/ui/DialogTrigger';
import { useFaqForm } from '../hooks/useFaqForm';
import { faqPublishLabel } from '../data/faqValidation';
import {
  errorClass,
  hintClass,
  inputClass,
  labelClass,
  noticeClass,
  textareaClass,
} from '../data/faqStyles';

/** Form tambah/ubah FAQ: kategori, pertanyaan, jawaban, status publikasi. */
export function FaqForm({
  initial,
  categories,
  action,
}: {
  initial?: RecordData;
  categories: string[];
  action: (state: FormState, form: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const close = useDialogClose();
  const form = useFaqForm({ initial, categories });
  const questionError = state.errors?.question || form.errors.question;
  const answerError = state.errors?.answer || form.errors.answer;

  return (
    <form
      action={(data) => {
        form.setTouched(true);
        data.set('published', String(form.values.published));
        formAction(data);
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <DialogBody className="flex flex-col gap-16">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-12 max-sm:grid-cols-1">
          <div className="min-w-0">
            <label htmlFor="faq-category" className={labelClass}>
              Kategori FAQ
            </label>
            <select
              id="faq-category"
              name="category"
              className={inputClass}
              value={form.values.category}
              required
              disabled={pending}
              onChange={(event) => form.set('category', event.target.value)}
              aria-invalid={!!state.errors?.category}
            >
              {!categories.length && (
                <option value="">Tambahkan kategori terlebih dahulu</option>
              )}
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
            {state.errors?.category && (
              <span className={errorClass}>{state.errors.category}</span>
            )}
          </div>
          <label
            htmlFor="faq-published"
            className="flex min-h-44 items-center gap-10 rounded-control border border-line bg-surface px-12 py-10"
          >
            <span className="min-w-0">
              <strong className="block text-sm font-semibold text-ink">
                {form.values.published ? 'Aktif' : 'Draf'}
              </strong>
              <small className={hintClass + ' mt-0'}>
                {faqPublishLabel(form.values.published)}
              </small>
            </span>
            <input
              id="faq-published"
              type="checkbox"
              role="switch"
              className="peer sr-only"
              checked={form.values.published}
              disabled={pending}
              onChange={(event) => form.set('published', event.target.checked)}
            />
            <span
              aria-hidden="true"
              className="relative h-24 w-44 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-accent after:absolute after:top-3 after:left-3 after:size-18 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-20"
            />
          </label>
        </div>

        <div>
          <label htmlFor="faq-question" className={labelClass}>
            Pertanyaan FAQ
          </label>
          <input
            id="faq-question"
            name="question"
            className={inputClass}
            required
            maxLength={200}
            value={form.values.question}
            disabled={pending}
            placeholder="Contoh: Apakah CleanGo menyediakan peralatan?"
            onChange={(event) => form.set('question', event.target.value)}
            aria-invalid={!!questionError}
          />
          {questionError && (
            <span className={errorClass} role="alert">
              {questionError}
            </span>
          )}
        </div>

        <div>
          <label htmlFor="faq-answer" className={labelClass}>
            Jawaban FAQ
          </label>
          <textarea
            id="faq-answer"
            name="answer"
            className={textareaClass}
            required
            rows={8}
            maxLength={5000}
            value={form.values.answer}
            disabled={pending}
            placeholder="Tulis jawaban lengkap yang akan dibaca pelanggan."
            onChange={(event) => form.set('answer', event.target.value)}
            aria-invalid={!!answerError}
          />
          {answerError ? (
            <span className={errorClass} role="alert">
              {answerError}
            </span>
          ) : (
            <small className={hintClass}>
              Jawaban tampil apa adanya, termasuk baris baru.
            </small>
          )}
        </div>

        {state.message && (
          <p className={noticeClass} role="alert">
            {state.message}
          </p>
        )}
      </DialogBody>
      <DialogFooter className="items-center">
        <span className="mr-auto text-xs text-ink-muted">
          {initial?.id ? '#' + initial.id : 'FAQ baru'} ·{' '}
          {faqPublishLabel(form.values.published)}
        </span>
        {close ? (
          <Button variant="ghost" disabled={pending} onClick={close}>
            Batal
          </Button>
        ) : (
          <Link className={buttonVariants({ variant: 'ghost' })} href="/faq">
            Batal
          </Link>
        )}
        <SubmitButton disabled={pending}>
          {initial?.id ? 'Simpan perubahan' : 'Simpan FAQ'}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
