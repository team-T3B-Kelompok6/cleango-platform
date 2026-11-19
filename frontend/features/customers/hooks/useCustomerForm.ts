'use client';
import { useState } from 'react';
import type { RecordData } from '@/types';
import {
  customerFormValues,
  type CustomerValues,
} from '../data/customerValidation';

/** State form ubah customer. */
export function useCustomerForm({ initial }: { initial?: RecordData }) {
  const [values, setValues] = useState<CustomerValues>(() =>
    customerFormValues(initial),
  );

  function set<K extends keyof CustomerValues>(
    name: K,
    value: CustomerValues[K],
  ) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  return { values, set };
}
