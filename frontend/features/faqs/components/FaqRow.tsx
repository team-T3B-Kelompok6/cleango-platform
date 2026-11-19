import type { RecordData } from '@/types';
import { valueText } from '@/lib/resources';
import { faqCategoryTone, faqUpdatedLabel } from '../data/faqDisplay';
import { RecordActions } from '@/components/RecordActions';
import {
  answerClass,
  answersRowClass,
  categoryTagBase,
  categoryTagClass,
  metaClass,
  publishClass,
  questionClass,
  rowClass,
} from '../data/faqStyles';

/** Satu baris FAQ: tag kategori, status publikasi, pertanyaan, jawaban. */
export function FaqRow({
  item,
  edit,
}: {
  item: RecordData;
  edit: (item: RecordData, label?: string) => React.ReactNode;
}) {
  const updated = faqUpdatedLabel(item.updatedAt);
  return (
    <article className={rowClass}>
      <div>
        <div className="flex flex-col gap-14 border-b border-line-soft pb-18 max-sm:gap-10">
          <span className={metaClass}>
            <span
              className={
                categoryTagBase +
                ' ' +
                categoryTagClass[faqCategoryTone(String(item.category))]
              }
            >
              {valueText(item.category)}
            </span>
            <span className={publishClass}>
              <i className="size-[4px] shrink-0 rounded-full bg-current" />
              {item.published ? 'Aktif' : 'Draf'}
            </span>
            {updated && (
              <small className="text-xs text-ink-faint">
                Diperbarui {updated}
              </small>
            )}
          </span>
          <strong className={questionClass}>{valueText(item.question)}</strong>
        </div>
        <div className={answersRowClass}>
          <p className={'m-0 ' + answerClass}>{valueText(item.answer)}</p>
          <RecordActions resource="faqs" record={item} edit={edit} />
        </div>
      </div>
    </article>
  );
}
