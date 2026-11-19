'use client';
import { UiIcon } from '@/components/ui/UiIcon';
import { Button } from '@/components/ui';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import {
  useState,
  useRef,
  useTransition,
  useEffect,
  type CSSProperties,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useOutsideDismiss } from '@/hooks/useOutsideDismiss';
import { DialogFooter } from '@/components/ui/DialogFooter';
import { DialogHeader } from '@/components/ui/DialogHeader';
import { TabButton } from '@/components/ui/TabButton';
import { Tabs } from '@/components/ui/Tabs';
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
      const header = document
        .querySelector('[data-topbar]')
        ?.getBoundingClientRect();
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
      className={
        tabs.length ? 'flex min-w-0 flex-1 flex-col gap-14' : 'next-date-filter'
      }
      aria-busy={pending}
    >
      {date && (
        <div className="date-filter-anchor" ref={ref}>
          <Button variant="ghost" onClick={toggle} aria-expanded={open}>
            <Icon name="calendar" />
            {params.get('from') || params.get('to')
              ? 'Tanggal difilter'
              : 'Filter Tanggal'}
          </Button>
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
            <DialogHeader
              title={`Pilih Tanggal ${
                pathname === '/jadwal' ? 'Jadwal' : 'Pesanan'
              }`}
              subtitle="Kalender & reservasi Cleango"
              onClose={() => setOpen(false)}
              icon={
                <span className="calendar-summary-icon grid size-[36px] shrink-0 place-items-center rounded-md bg-surface-tint text-success">
                  <Icon name="calendar" />
                </span>
              }
            />
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
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFrom('');
                    setTo('');
                    apply({ from: '', to: '' });
                    setOpen(false);
                  }}
                >
                  Semua tanggal
                </Button>
                <Button type="submit" disabled={!!(from && to && from > to)}>
                  <UiIcon name="tick" />
                  Pilih tanggal
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      )}
      {tabs.length > 0 && (
        <Tabs label="Filter daftar">
          {tabs.map((tab, index) => (
            <TabButton
              key={tab}
              active={(params.get('tab') ?? tabs[0]) === tab}
              onClick={() => apply({ tab: index ? tab : '' })}
            >
              <CategoryIcon src={tabIcons[tab] ?? ''} />
              {pathname === '/petugas'
                ? ((
                    {
                      Tersedia: 'Siaga & Tersedia',
                    } as Record<string, string>
                  )[tab] ?? tab)
                : tab === 'Menunggu Lokasi'
                  ? 'Siap Berangkat'
                  : tab}
            </TabButton>
          ))}
        </Tabs>
      )}
    </div>
  );
}
