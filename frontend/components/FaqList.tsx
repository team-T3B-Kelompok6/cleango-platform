import Link from 'next/link';
import { valueText } from '@/lib/resources';
import { Icon } from './Icon';

import { DeleteRecordButton } from './DeleteRecordButton';

import type { RecordListProps } from './RecordListProps';
export function FaqList({ shown, resource, config, edit }: RecordListProps) {
  return (
    <>
      {resource === 'faqs' &&
        shown.map((item) => (
          <article key={item.id} className="faq-design-row">
            <div className="faq-header-actions">
              {edit(item, 'Ubah FAQ')}
              <DeleteRecordButton resource={resource} record={item} />
            </div>
            <details>
              <summary>
                <span>
                  <span className="faq-row-meta">
                    <span
                      className={
                        'faq-category-tag ' +
                        (
                          {
                            Layanan: 'green',
                            Jadwal: 'blue',
                            Pembayaran: 'amber',
                            SOP: 'purple',
                          } as Record<string, string>
                        )[String(item.category)]
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
              <div className="figma-row-actions">
                <Link
                  className="button"
                  href={config.path + '/' + encodeURIComponent(item.id)}
                >
                  Detail & Pratinjau
                </Link>
              </div>
            </details>
          </article>
        ))}
    </>
  );
}
