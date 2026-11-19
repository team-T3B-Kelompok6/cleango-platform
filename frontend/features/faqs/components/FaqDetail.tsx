import type { Faq } from '@/types';
import { faqDateLabel } from '../data/faqDisplay';
import { UiIcon } from '@/components/ui';

/** Pratinjau FAQ di dialog detail: kategori, Q/A, statistik, tanggal. */
export function FaqDetail({ faq }: { faq: Faq }) {
  const views =
    typeof faq.viewCount === 'number' && faq.viewCount >= 0
      ? 'Dibaca ' + faq.viewCount.toLocaleString('id-ID') + ' kali'
      : 'Statistik pembaca belum tersedia';
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-12 text-sm text-ink-muted">
        <span className="inline-flex items-center gap-5">
          Kategori:{' '}
          <b className="inline-flex items-center gap-5 rounded-full border border-line-strong bg-accent-soft px-9 py-3 text-xs font-semibold text-accent">
            <UiIcon name="tag" className="size-[13px]" />
            {faq.category}
          </b>
        </span>
        <span
          className={
            'inline-flex items-center gap-5 rounded-full px-8 py-5 text-xs font-bold ' +
            (faq.published
              ? 'bg-success-soft text-success'
              : 'bg-neutral-soft text-ink-muted')
          }
        >
          <i className="size-[5px] rounded-full bg-current" />
          {faq.published ? 'Aktif di Aplikasi' : 'Draf'}
        </span>
      </div>
      <section className="border-b border-line-soft py-16">
        <h3 className="mb-8 text-sm leading-[1.5] font-medium text-ink-muted">
          Pertanyaan
        </h3>
        <p className="text-base leading-[1.7] font-medium break-words text-ink">
          {faq.question}
        </p>
      </section>
      <section className="border-b border-line-soft py-16">
        <h3 className="mb-8 text-sm leading-[1.5] font-medium text-ink-muted">
          Jawaban
        </h3>
        <p className="text-base leading-[1.8] whitespace-pre-line break-words text-ink-muted">
          {faq.answer}
        </p>
      </section>
      <div className="flex flex-wrap items-baseline gap-16 text-xs leading-[1.6] text-ink-muted">
        <span className="inline-flex flex-1 items-center gap-5">
          <UiIcon name="eye" className="size-[14px]" />
          {views}
        </span>
        <span className="block">
          Terakhir diperbarui
          <br />
          {faqDateLabel(faq.updatedAt)}
        </span>
      </div>
    </>
  );
}
