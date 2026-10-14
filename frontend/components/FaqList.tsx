import { valueText } from '@/lib/resources';
import { Icon } from './Icon';

import { RecordActions } from './RecordActions';

import type { RecordListProps } from './RecordListProps';
export function FaqList({ shown, resource, edit }: RecordListProps) {
  return (
    <>
      {resource === 'faqs' &&
        shown.map((item) => (
          <article key={item.id} className="faq-design-row managed-faq-row">
            <details>
              <summary>
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
                    {typeof item.updatedAt === 'string' && (
                      <small>
                        Diperbarui{' '}
                        {new Date(item.updatedAt).toLocaleDateString('id-ID')}
                      </small>
                    )}
                  </span>
                  <strong>{valueText(item.question)}</strong>
                </span>
                <Icon name="down" />
              </summary>
              <p>{valueText(item.answer)}</p>
            </details>
            <div className="managed-record-footer">
              <RecordActions resource={resource} record={item} edit={edit} />
            </div>
          </article>
        ))}
    </>
  );
}
