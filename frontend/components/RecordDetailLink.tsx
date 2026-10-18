'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { resources } from '@/lib/resources';
import { detailFilterKeys } from '@/lib/detail-return';
import type { Resource } from '@/types';
export function RecordDetailLink({
  resource,
  id,
}: {
  resource: Resource;
  id: string;
}) {
  const path = usePathname(),
    search = useSearchParams(),
    config = resources[resource];
  const filters = new URLSearchParams();
  if (path === config.path)
    for (const key of detailFilterKeys) {
      const value = search.get(key);
      if (value) filters.set(key, value);
    }
  const query = new URLSearchParams(filters);
  if (filters.size)
    query.set('returnTo', config.path + '?' + filters.toString());
  const href =
    config.path +
    '/' +
    encodeURIComponent(id) +
    (query.size ? '?' + query.toString() : '');
  return (
    <Link
      className="button"
      aria-label={'Detail ' + config.singular + ' ' + id}
      href={href}
      scroll={false}
    >
      Detail
    </Link>
  );
}
