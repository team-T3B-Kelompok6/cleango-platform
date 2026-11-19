import type { AdminCleanerTask, TaskBoard } from '@/types/cleaner';
import type { StaffGroup } from '@/lib/tracking';
import { displayId } from '@/lib/display';
import { Button, UiIcon } from '@/components/ui';
import { StaffMonitorCard } from './StaffMonitorCard';
import {
  boardHeadingClass,
  contentClass,
  emptyClass,
  errorClass,
  filtersClass,
  headingNoteClass,
  headingTitleClass,
  mutedTextClass,
  searchFieldClass,
  searchInputClass,
} from './data';

/** Daftar petugas beserta penugasannya. */
export function MonitorBoard({
  groups,
  board,
  scoped,
  initialName,
  initialOrderId,
  error,
  search,
  onSearch,
  onReload,
  busy,
  choices,
  onChoose,
  onOpen,
  onLocate,
}: {
  groups: StaffGroup[];
  board: TaskBoard | null;
  scoped: boolean;
  initialName?: string;
  initialOrderId?: string;
  error: string;
  search: string;
  onSearch: (value: string) => void;
  onReload: () => void;
  busy: string;
  choices: Record<string, string>;
  onChoose: (key: string, orderId: string) => void;
  onOpen: (item: AdminCleanerTask) => void;
  onLocate: (item: AdminCleanerTask) => void;
}) {
  return (
    <div className={contentClass}>
      <div className={boardHeadingClass}>
        <div>
          <h3 className={headingTitleClass}>
            {initialOrderId
              ? 'Petugas pesanan #' + displayId(initialOrderId)
              : initialName || 'Daftar petugas'}
          </h3>
          <p className={headingNoteClass}>
            {board
              ? groups.length + ' petugas · diperbarui otomatis'
              : 'Memuat petugas…'}
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={onReload}>
          <UiIcon name="clock" />
          Muat ulang
        </Button>
      </div>
      {!scoped && (
        <div className={filtersClass}>
          <label className={searchFieldClass}>
            <UiIcon name="search" />
            <input
              aria-label="Cari petugas"
              className={searchInputClass}
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Cari nama petugas…"
            />
          </label>
          {search && (
            <Button size="sm" variant="ghost" onClick={() => onSearch('')}>
              Semua petugas
            </Button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className={errorClass}>
          {error}
        </p>
      )}
      {!board && !error && (
        <p role="status" className={mutedTextClass}>
          Memuat petugas…
        </p>
      )}
      <div
        className={
          scoped
            ? 'grid grid-cols-1 gap-18'
            : 'grid grid-cols-2 gap-18 max-md:grid-cols-1'
        }
      >
        {groups.map((group) => (
          <StaffMonitorCard
            key={group.key}
            group={group}
            orderId={initialOrderId}
            busy={busy}
            selectedOrderId={choices[group.key]}
            onSelectOrder={(orderId) => onChoose(group.key, orderId)}
            onOpen={onOpen}
            onLocate={onLocate}
          />
        ))}
      </div>
      {board && !groups.length && (
        <p className={emptyClass}>
          {initialOrderId
            ? 'Belum ada petugas yang ditugaskan pada pesanan ini.'
            : 'Tidak ada petugas dengan penugasan yang sesuai pencarian.'}
        </p>
      )}
    </div>
  );
}
