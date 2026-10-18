import { valueText } from '@/lib/resources';

import { RecordActions } from './RecordActions';

import type { RecordListProps } from './RecordListProps';
export function FaqList({ shown, resource, edit }: RecordListProps) {
  return (
    <>
      {resource === 'faqs' &&
        shown.map((item) => (
          <article key={item.id} className="faq-design-row managed-faq-row">
            <section>
              <div className="faq-row-question">
                <span>
                  <span className="faq-row-meta">
                    <span
                      className={
                        'faq-category-tag ' +
                        ((
                          {
                            Layanan: 'green',
                            Jadwal: 'blue',
                            Pembayaran: 'amber',
                            SOP: 'purple',
                          } as Record<string, string>
                        )[String(item.category)] ?? 'green')
                      }
                    >
                      {valueText(item.category)}
                    </span>
                    <span className="faq-publish-tag">
                      <i />
                      {item.published ? 'Aktif' : 'Draf'}
                    </span>
                    {typeof item.updatedAt === 'string' &&
                      Number.isFinite(Date.parse(item.updatedAt)) && (
                        <small>
                          Diperbarui{' '}
                          {new Date(item.updatedAt).toLocaleDateString(
                            'id-ID',
                            { timeZone: 'Asia/Jakarta' },
                          )}
                        </small>
                      )}
                  </span>
                  <strong>{valueText(item.question)}</strong>
                </span>
              </div>
              <div className="faq-answer-row">
                <p className="faq-row-answer">{valueText(item.answer)}</p>
                <RecordActions resource={resource} record={item} edit={edit} />
              </div>
            </section>
          </article>
        ))}
    </>
  );
}
