import {
  errorClass,
  hintClass,
  skillListClass,
  skillOptionClass,
} from '../data/staffStyles';

/** Pilihan keahlian petugas; tampil sebagai daftar centang yang bisa digulir. */
export function StaffSkills({
  options,
  selected,
  disabled,
  hint,
  error,
  onToggle,
}: {
  options: string[];
  selected: string[];
  disabled: boolean;
  hint?: string;
  error?: string;
  onToggle: (skill: string, checked: boolean) => void;
}) {
  return (
    <fieldset
      className="m-0 min-w-0 border-0 p-0"
      aria-describedby="staff-skills-hint"
      aria-invalid={!!error}
    >
      <legend className="mb-9 font-semibold text-ink-soft">
        Keahlian petugas
      </legend>
      <div className={skillListClass}>
        {options.map((option) => (
          <label key={option} className={skillOptionClass}>
            <input
              type="checkbox"
              className="size-[15px]! min-h-0! shrink-0 p-0! accent-accent"
              checked={selected.includes(option)}
              disabled={disabled}
              onChange={(event) => onToggle(option, event.target.checked)}
            />
            <span className="min-w-0 flex-1 break-words">{option}</span>
          </label>
        ))}
        {!options.length && (
          <span className="text-sm text-ink-muted">
            Belum ada layanan. Tambahkan layanan di Kelola Layanan.
          </span>
        )}
      </div>
      {hint && (
        <small className={hintClass} id="staff-skills-hint">
          {hint}
        </small>
      )}
      {error && (
        <span className={errorClass} role="alert">
          {error}
        </span>
      )}
    </fieldset>
  );
}
