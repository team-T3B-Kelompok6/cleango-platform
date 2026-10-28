'use client';
import { UiIcon } from './UiIcon';
import { CategoryIcon } from './CategoryIcon';
import {
  useState,
  useRef,
  useTransition,
  useEffect,
  type CSSProperties,
} from 'react';
import Form from 'next/form';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Icon } from './Icon';
import { useOutsideDismiss } from './useOutsideDismiss';
import { DateCalendar } from './DateCalendar';
const validDate = (value: string | null) =>
  value &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value
    ? value
    : '';
export function Filters({
  tabs = [],
  tabIcons = {},
  date = false,
  dateCounts = {},
  today = '',
}: {
  tabs?: string[];
  tabIcons?: Record<string, string>;
  date?: boolean;
  dateCounts?: Record<string, number>;
  today?: string;
}) {
  const router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams();
  const [open, setOpen] = useState(false),
    [from, setFrom] = useState(validDate(params.get('from'))),
    [to, setTo] = useState(validDate(params.get('to')));
  const [pending, startTransition] = useTransition();
  const [placement, setPlacement] = useState({
    above: false,
    center: false,
    room: 0,
    top: 0,
  });
  const ref = useRef<HTMLDivElement>(null);
  useOutsideDismiss(ref, open, () => setOpen(false));
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const anchor = ref.current?.getBoundingClientRect();
      if (!anchor) return;
      const header = document.querySelector('.header')?.getBoundingClientRect();
      const top = Math.max(16, (header?.bottom ?? 0) + 12);
      if (
        anchor.top < (header?.bottom ?? 0) ||
        anchor.top >= window.innerHeight
      ) {
        setOpen(false);
        return;
      }
      const below = window.innerHeight - anchor.bottom - 28;
      const above = anchor.top - top - 12;
      const center = Math.max(below, above) < 240;
      const useAbove = below < 200 && above > below;
      const room = Math.max(
        0,
        center ? window.innerHeight - top - 16 : useAbove ? above : below,
      );
      setPlacement((current) =>
        current.above === useAbove &&
        current.center === center &&
        current.room === room &&
        current.top === top
          ? current
          : { above: useAbove, center, room, top },
      );
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open]);
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
      setFrom(validDate(params.get('from')));
      setTo(validDate(params.get('to')));
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
            data-placement={
              placement.center ? 'center' : placement.above ? 'above' : 'below'
            }
            style={
              placement.room
                ? ({
                    '--date-popover-room': `${placement.room}px`,
                    '--date-popover-top': `${placement.top}px`,
                  } as CSSProperties)
                : undefined
            }
            data-open={open}
            aria-hidden={!open}
            inert={!open}
            role="dialog"
            aria-label="Filter tanggal"
          >
            <div className="modal-header">
              <div className="calendar-title">
                <span className="calendar-summary-icon">
                  <Icon name="calendar" />
                </span>
                <div>
                  <h2>
                    Pilih Tanggal{' '}
                    {pathname === '/jadwal' ? 'Jadwal' : 'Pesanan'}
                  </h2>
                  <p>Kalender &amp; reservasi Cleango</p>
                </div>
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
              {open && (
                <DateCalendar
                  from={from}
                  to={to}
                  today={
                    today ||
                    new Intl.DateTimeFormat('en-CA', {
                      timeZone: 'Asia/Jakarta',
                    }).format(new Date())
                  }
                  counts={dateCounts}
                  noun={pathname === '/jadwal' ? 'Jadwal' : 'Pesanan'}
                  onChange={(start, end) => {
                    setFrom(start);
                    setTo(end);
                  }}
                />
              )}
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
                  <UiIcon name="tick" />
                  Pilih tanggal
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
              {tabIcons[tab] && <CategoryIcon src={tabIcons[tab]} />}
              {pathname === '/petugas'
                ? ((
                    {
                      Tersedia: 'Siaga & Tersedia',
                    } as Record<string, string>
                  )[tab] ?? tab)
                : tab === 'Menunggu Lokasi'
                  ? 'Siap Berangkat'
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
  const section = '/' + (pathname.split('/')[1] ?? '');
  const action = ['/', '/laporan'].includes(section) ? '/pesanan' : section;
  const pageLabels: Record<string, string> = {
    '/': 'Dashboard Utama',
    '/pesanan': 'Kelola Pesanan',
    '/jadwal': 'Kelola Jadwal',
    '/layanan': 'Kelola Layanan',
    '/petugas': 'Kelola Data Petugas',
    '/customer': 'Kelola Data Customer',
    '/laporan': 'Laporan',
    '/faq': 'Kelola FAQ',
    '/audit-log': 'Audit Log Admin',
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
            : `Cari di ${pageLabels[section] ?? 'Cleango'}…`
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
