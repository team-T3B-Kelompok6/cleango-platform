import type { RecordData } from '@/types';

export type CustomerValues = {
  name: string;
  phone: string;
  email: string;
  address: string;
  joined: string;
  active: boolean;
};

/** Nilai awal form customer. */
export function customerFormValues(record?: RecordData): CustomerValues {
  return {
    name: String(record?.name ?? ''),
    phone: String(record?.phone ?? ''),
    email: String(record?.email ?? ''),
    address: String(record?.address ?? ''),
    joined: String(record?.joined ?? '').slice(0, 10),
    active: record ? record.active !== false : true,
  };
}
