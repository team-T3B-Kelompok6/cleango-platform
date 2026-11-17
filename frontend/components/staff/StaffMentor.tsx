import type { StaffMentor as Mentor } from '@/lib/staff';
import { errorClass, hintClass, inputClass, labelClass } from './data';

/** Pilihan mentor untuk petugas yang masih masa training. */
export function StaffMentor({
  mentors,
  value,
  disabled,
  error,
  onChange,
}: {
  mentors: Mentor[];
  value: string;
  disabled: boolean;
  error?: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor="staff-mentor" className={labelClass}>
        Mentor senior
      </label>
      <select
        id="staff-mentor"
        className={inputClass}
        value={value}
        disabled={disabled}
        aria-invalid={!!error}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Tanpa mentor</option>
        {mentors.map((mentor) => (
          <option key={mentor.id} value={mentor.id}>
            {mentor.name}
          </option>
        ))}
      </select>
      <small className={hintClass}>
        Opsional. Hanya petugas aktif non-training. Keahliannya tampil sebagai
        materi pendampingan, bukan keahlian trainee.
      </small>
      {error && (
        <span className={errorClass} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
