import { Icon } from '@/components/shared/ui';
import { emptyBodyClass, emptyClass, emptyTitleClass } from './data';

/** Kartu ajakan saat shift masih kosong atau ganjil. */
export function EmptyShiftCard() {
  return (
    <article className={emptyClass}>
      <Icon name="clock" className="size-20 opacity-70" />
      <h3 className={emptyTitleClass}>Belum ada jadwal tambahan</h3>
      <p className={emptyBodyClass}>
        Tambahkan shift kerja petugas agar dapat dipilih saat penugasan pesanan.
      </p>
    </article>
  );
}
