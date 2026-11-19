import type { RecordData } from '@/types';

export type StaffFormValues = {
  name: string;
  phone: string;
  status: string;
  skills: string[];
  trainerId: string;
};

/** Nilai awal form tambah/ubah petugas. */
export function staffFormValues(record?: RecordData): StaffFormValues {
  return {
    name: String(record?.name ?? ''),
    phone: String(record?.phone ?? ''),
    status: String(record?.status ?? 'Tersedia'),
    skills: Array.isArray(record?.skills) ? record.skills.map(String) : [],
    trainerId: String(record?.trainerId ?? ''),
  };
}

/** Petugas berstatus training tidak memilih keahlian. */
export function isStaffTraining(values: StaffFormValues) {
  return values.status === 'Masa Training';
}

/** Susun FormData sesuai kontrak server action `saveAction`. */
export function appendStaffForm(
  form: FormData,
  values: StaffFormValues,
  photo: { file: File | null; removed: boolean },
) {
  form.set('name', values.name);
  form.set('phone', values.phone);
  form.set('status', values.status);
  form.set('trainerId', values.trainerId);
  for (const skill of values.skills) form.append('skills', skill);
  if (photo.file) form.set('staffPhoto', photo.file);
  form.set('removeStaffPhoto', String(photo.removed));
}
