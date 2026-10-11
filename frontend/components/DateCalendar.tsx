'use client';

import { useState, type KeyboardEvent } from 'react';
import { Icon } from './Icon';
import { UiIcon } from './UiIcon';

const weekdays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const parseDate = (value: string) => new Date(value + 'T00:00:00Z');
const formatDate = (value: string, full = false) =>
  new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: full ? 'long' : 'short',
    year: 'numeric',
    ...(full ? { weekday: 'long' as const } : {}),
    timeZone: 'UTC',
  }).format(parseDate(value));

export function DateCalendar({
  from,
  to,
  today,
  counts,
  noun,
  onChange,
}: {
  from: string;
  to: string;
  today: string;
  counts: Record<string, number>;
  noun: string;
  onChange: (from: string, to: string) => void;
}) {
  const [month, setMonth] = useState(() =>
    parseDate((from || today).slice(0, 7) + '-01'),
  );
  const [selectingEnd, setSelectingEnd] = useState(false);
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const firstWeekday = (month.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cells = Math.ceil((firstWeekday + days) / 7) * 7;
  const monthLabel = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(month);
  const count = Object.entries(counts).reduce(
    (total, [date, amount]) =>
      from && date >= from && date <= (to || from) ? total + amount : total,
    0,
  );

  function select(date: string) {
    if (selectingEnd && from) {
      onChange(date < from ? date : from, date < from ? from : date);
      setSelectingEnd(false);
    } else {
      onChange(date, date);
      setSelectingEnd(true);
    }
  }
  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const offset = offsets[event.key];
    if (offset === undefined) return;
    const next = parseDate(date);
    next.setUTCDate(next.getUTCDate() + offset);
    // Keep arrow navigation within this visible month; month controls handle crossing it.
    if (next.getUTCMonth() !== monthIndex || next.getUTCFullYear() !== year)
      return;
    event.preventDefault();
    event.currentTarget
      .closest('.date-calendar')
      ?.querySelector<HTMLButtonElement>(`[data-date="${dateKey(next)}"]`)
      ?.focus();
  }

  return (
    <div className="date-calendar">
      <div className="calendar-navigation">
        <div>
          <button
            type="button"
            className="calendar-arrow previous"
            aria-label="Bulan sebelumnya"
            onClick={() =>
              setMonth(new Date(Date.UTC(year, monthIndex - 1, 1)))
            }
          >
            <UiIcon name="chevron" />
          </button>
          <strong aria-live="polite">{monthLabel}</strong>
          <button
            type="button"
            className="calendar-arrow"
            aria-label="Bulan berikutnya"
            onClick={() =>
              setMonth(new Date(Date.UTC(year, monthIndex + 1, 1)))
            }
          >
            <UiIcon name="chevron" />
          </button>
        </div>
        <button
          type="button"
          className="calendar-today"
          onClick={() => {
            setMonth(parseDate(today.slice(0, 7) + '-01'));
            onChange(today, today);
            setSelectingEnd(false);
          }}
        >
          Hari ini
        </button>
      </div>
      <div className="calendar-weekdays" aria-hidden="true">
        {weekdays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-days" aria-label={monthLabel}>
        {Array.from({ length: cells }, (_, index) => {
          const day = index - firstWeekday + 1;
          const date = dateKey(new Date(Date.UTC(year, monthIndex, day)));
          const outside = day < 1 || day > days;
          const selected = !!from && date >= from && date <= (to || from);
          const edge = date === from || date === to;
          return (
            <button
              key={date}
              type="button"
              disabled={outside}
              data-date={date}
              data-selected={selected}
              data-edge={edge}
              aria-pressed={selected}
              aria-current={date === today ? 'date' : undefined}
              aria-label={`${formatDate(date, true)}${counts[date] ? `, ${counts[date]} ${noun.toLowerCase()}` : ''}`}
              onClick={() => select(date)}
              onKeyDown={(event) => moveFocus(event, date)}
            >
              <span>{parseDate(date).getUTCDate()}</span>
              {!outside && (
                <small aria-hidden="true">{counts[date] || '·'}</small>
              )}
            </button>
          );
        })}
      </div>
      <div className="calendar-selection" aria-live="polite">
        <span className="calendar-summary-icon">
          <Icon name="calendar" />
        </span>
        <div>
          <strong>
            {from
              ? to && to !== from
                ? `${formatDate(from)} – ${formatDate(to)}`
                : formatDate(from, true)
              : 'Belum ada tanggal dipilih'}
          </strong>
          <span>
            {from
              ? `${count} ${noun.toLowerCase()} pada tanggal terpilih`
              : 'Semua tanggal ditampilkan'}
          </span>
        </div>
        {from && <i />}
      </div>
      <p className="calendar-hint">
        <UiIcon name="zap" />
        <span>
          Pilih satu tanggal, atau klik tanggal kedua untuk memilih rentang.
        </span>
      </p>
      <div className="calendar-date-inputs">
        <label>
          Dari tanggal
          <input
            type="date"
            value={from}
            onChange={(event) => {
              onChange(
                event.target.value,
                to && to < event.target.value ? event.target.value : to,
              );
              if (event.target.value)
                setMonth(parseDate(event.target.value.slice(0, 7) + '-01'));
              setSelectingEnd(false);
            }}
          />
        </label>
        <label>
          Sampai tanggal
          <input
            type="date"
            min={from || undefined}
            value={to}
            onChange={(event) => {
              onChange(from, event.target.value);
              setSelectingEnd(false);
            }}
          />
        </label>
      </div>
    </div>
  );
}
