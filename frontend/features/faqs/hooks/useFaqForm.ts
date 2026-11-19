'use client';
import { useState } from 'react';
import type { RecordData } from '@/types';
import {
  faqFormValues,
  validateFaq,
  type FaqValues,
} from '../data/faqValidation';

/** State form FAQ: kategori, pertanyaan, jawaban, status publikasi. */
export function useFaqForm({
  initial,
  categories,
}: {
  initial?: RecordData;
  categories: string[];
}) {
  const [values, setValues] = useState<FaqValues>(() =>
    faqFormValues(initial, categories),
  );
  const [touched, setTouched] = useState(false);
  const errors = touched ? validateFaq(values) : { question: '', answer: '' };

  function set<K extends keyof FaqValues>(name: K, value: FaqValues[K]) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  return { values, set, errors, setTouched };
}
