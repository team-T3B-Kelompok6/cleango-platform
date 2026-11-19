# Aturan `features/faqs/`

Kelola FAQ: daftar berkelompok, detail, dan form tambah/ubah.

## Isi

| Berkas                     | Lapisan | Isi                                                    |
| -------------------------- | ------- | ------------------------------------------------------ |
| `api/faqsApi.ts`           | server  | `getFaqs`, `getFaq`                                    |
| `data/faqDisplay.ts`       | data    | `faqTabs`, `faqSummary`, label tanggal/warna/ringkasan |
| `data/faqStyles.ts`        | data    | kelas bersama                                          |
| `data/faqValidation.ts`    | data    | `faqFormValues`, `validateFaq`, label publikasi        |
| `hooks/useFaqForm.ts`      | client  | state form FAQ                                         |
| `components/FaqList.tsx`   | server  | daftar + empty state                                   |
| `components/FaqRow.tsx`    | server  | satu baris FAQ                                         |
| `components/FaqDetail.tsx` | server  | detail FAQ                                             |
| `components/FaqForm.tsx`   | client  | form tambah/ubah                                       |
| `index.ts`                 | barrel  | dipakai `ResourcePages`, detail, form, ringkasan       |

## Aturan

1. **Tab kategori dari `faqTabs()`** (gabungan kategori tersimpan + data lama), bukan dari
   komponen.
2. **Validasi dipakai server dan klien** lewat `data/faqValidation.ts`; jangan menyalin aturan
   wajib/panjang teks ke `.tsx`.
3. **Label publikasi/tanggal di `faqDisplay`**, jangan menulis format baru di komponen.
4. **Detail FAQ dibaca `RecordDetailServer`**; jangan membuat jalur data kedua.
