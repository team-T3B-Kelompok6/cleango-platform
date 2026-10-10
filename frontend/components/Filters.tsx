'use client';
import { UiIcon } from './UiIcon';
import { useState, useRef, useTransition } from 'react';
import Form from 'next/form';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Icon } from './Icon';
import { useOutsideDismiss } from './useOutsideDismiss';
export function Filters({
  tabs = [],
  date = false,
}: {
  tabs?: string[];
  date?: boolean;
}) {
  const router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams();
  const [open, setOpen] = useState(false),
    [from, setFrom] = useState(params.get('from') ?? ''),
    [to, setTo] = useState(params.get('to') ?? '');
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  useOutsideDismiss(ref, open, () => setOpen(false));
  function apply(values: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(values))
      v ? next.set(k, v) : next.delete(k);
    next.delete('page');
    startTransition(() =>
      router.push(pathname + (next.size ? '?' + next.toString() : ''), {
        scroll: false,
      }),
    );
  }
  function toggle() {
    if (!open) {
      setFrom(params.get('from') ?? '');
      setTo(params.get('to') ?? '');
    }
    setOpen(!open);
  }
  return (
    <div
      className={tabs.length ? 'next-filter' : 'next-date-filter'}
      aria-busy={pending}
    >
      {date && (
        <div className="date-filter-anchor" ref={ref}>
          <button
            className="button date-filter"
            type="button"
            onClick={toggle}
            aria-expanded={open}
          >
            <Icon name="calendar" />
            {params.get('from') || params.get('to')
              ? 'Tanggal difilter'
              : 'Filter Tanggal'}
          </button>
          <div
            className="date-popover"
            data-open={open}
            aria-hidden={!open}
            inert={!open}
            role="dialog"
            aria-label="Filter tanggal"
          >
            <div className="modal-header">
              <div>
                <h2>Filter tanggal</h2>
                <p>Pilih rentang tanggal pengerjaan.</p>
              </div>
              <button
                className="close-button"
                aria-label="Tutup filter tanggal"
                type="button"
                onClick={() => setOpen(false)}
              >
                <UiIcon name="close" />
              </button>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                apply({ from, to });
                setOpen(false);
              }}
            >
              <div className="modal-body form-grid">
                <label>
                  Dari tanggal
                  <input
                    type="date"
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                  />
                </label>
                <label>
                  Sampai tanggal
                  <input
                    type="date"
                    min={from || undefined}
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                  />
                </label>
              </div>
              <div className="modal-footer">
                <button
                  className="button"
                  type="button"
                  onClick={() => {
                    setFrom('');
                    setTo('');
                    apply({ from: '', to: '' });
                    setOpen(false);
                  }}
                >
                  Semua tanggal
                </button>
                <button
                  className="button primary"
                  type="submit"
                  disabled={!!(from && to && from > to)}
                >
                  Terapkan filter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {tabs.length > 0 && (
        <div
          className="order-tabs manage-tabs"
          role="group"
          aria-label="Filter daftar"
        >
          {tabs.map((tab, index) => (
            <button
              key={tab}
              type="button"
              aria-pressed={(params.get('tab') ?? tabs[0]) === tab}
              className={
                (params.get('tab') ?? tabs[0]) === tab ? 'selected' : ''
              }
              onClick={() => apply({ tab: index ? tab : '' })}
            >
              {pathname === '/petugas'
                ? ((
                    {
                      Tersedia: 'Siaga & Tersedia',
                      Bertugas: 'Sedang Bekerja',
                    } as Record<string, string>
                  )[tab] ?? tab)
                : tab}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
export function SearchInput({
  mobile = false,
  faq = false,
}: {
  mobile?: boolean;
  faq?: boolean;
}) {
  const params = useSearchParams(),
    pathname = usePathname();
  const action = ['/', '/laporan'].includes(pathname) ? '/pesanan' : pathname;
  const pageLabels: Record<string, string> = {
    '/': 'Dashboard Utama',
    '/pesanan': 'Kelola Pesanan',
    '/jadwal': 'Kelola Jadwal',
    '/layanan': 'Kelola Layanan',
    '/petugas': 'Kelola Data Petugas',
    '/customer': 'Kelola Data Customer',
    '/laporan': 'Laporan',
    '/faq': 'Kelola FAQ',
  };
  return (
    <Form
      action={action}
      className={
        faq
          ? 'faq-in-page-search'
          : mobile
            ? 'mobile-search global-search'
            : 'global-search'
      }
      key={params.get('q')}
    >
      <Icon name="search" />
      <input
        name="q"
        aria-label="Cari data"
        placeholder={
          faq
            ? 'Cari pertanyaan…'
            : `Cari di ${pageLabels[pathname] ?? 'Cleango'}…`
        }
        defaultValue={params.get('q') ?? ''}
      />
      {Array.from(params.entries())
        .filter(([key]) => !['q', 'page', 'saved', 'deleted'].includes(key))
        .map(([key, value]) => (
          <input key={key} name={key} type="hidden" value={value} />
        ))}
      <button aria-label="Jalankan pencarian" type="submit">
        <Icon name="arrow" />
      </button>
    </Form>
  );
}
