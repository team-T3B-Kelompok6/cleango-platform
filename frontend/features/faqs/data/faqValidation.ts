import type { RecordData } from '@/types';

export type FaqValues = {
  category: string;
  question: string;
  answer: string;
  published: boolean;
};

/** Nilai awal form FAQ. */
export function faqFormValues(
  record?: RecordData,
  categories: string[] = [],
): FaqValues {
  return {
    category: String(record?.category ?? categories[0] ?? ''),
    question: String(record?.question ?? ''),
    answer: String(record?.answer ?? ''),
    published: record ? record.published !== false : true,
  };
}

/** Validasi ringan di klien; server tetap memvalidasi ulang. */
export function validateFaq(values: FaqValues) {
  return {
    question: values.question.trim() ? '' : 'Pertanyaan wajib diisi.',
    answer: values.answer.trim() ? '' : 'Jawaban wajib diisi.',
  };
}

/** Label status publikasi. */
export function faqPublishLabel(published: boolean) {
  return published ? 'Aktif di aplikasi' : 'Draf';
}
