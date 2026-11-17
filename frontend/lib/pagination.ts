export const PAGE_SIZE = 10;

/** Nomor halaman dari query string; nilai aneh jatuh ke halaman 1. */
export function parsePage(value: unknown) {
  const page =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : 1;
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

/** Potong daftar per halaman; halaman berlebih dijepit ke halaman terakhir. */
export function paginate<T>(
  records: T[],
  requestedPage = 1,
  pageSize = PAGE_SIZE,
) {
  const size =
    Number.isSafeInteger(pageSize) && pageSize > 0 ? pageSize : PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(records.length / size));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const start = (page - 1) * size;
  return {
    page,
    pageCount,
    shown: records.slice(start, start + size),
    from: records.length ? start + 1 : 0,
    to: Math.min(start + size, records.length),
    total: records.length,
  };
}

/** Tautan halaman dengan filter pencarian yang sedang aktif. */
export function pageHref(
  path: string,
  search: Record<string, string | string[] | undefined>,
  page: number,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search))
    if (typeof value === 'string' && value && key !== 'page')
      params.set(key, value);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? path + '?' + query : path;
}

/** Deret nomor halaman dengan elipsis, mis. [1, 2, '…', 9, 10]. */
export function pageWindow(page: number, pageCount: number) {
  if (pageCount <= 7)
    return Array.from({ length: pageCount }, (_, index) => index + 1);

  const pages = new Set(
    [1, pageCount, page - 1, page, page + 1].filter(
      (value) => value >= 1 && value <= pageCount,
    ),
  );
  const sorted = Array.from(pages).sort((left, right) => left - right);
  const window: (number | '…')[] = [];
  let previous = 0;
  for (const value of sorted) {
    if (previous && value - previous > 1) window.push('…');
    window.push(value);
    previous = value;
  }
  return window;
}
