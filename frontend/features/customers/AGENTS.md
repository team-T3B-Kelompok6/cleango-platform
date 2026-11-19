# Aturan `features/customers/`

Kelola Data Customer: daftar, detail, dan form.

## Isi

| Berkas                          | Lapisan | Isi                                   |
| ------------------------------- | ------- | ------------------------------------- |
| `api/customersApi.ts`           | server  | `getCustomers`, `getCustomer`         |
| `components/CustomerList.tsx`   | server  | dispatcher daftar (`RecordListProps`) |
| `components/CustomerRow.tsx`    | server  | baris customer + aksi                 |
| `components/CustomerDetail.tsx` | server  | detail + riwayat pesanan              |
| `components/InfoCard.tsx`       | server  | kartu informasi                       |
| `components/CustomerForm.tsx`   | client  | form tambah/ubah                      |
| `data/customerStyles.ts`        | data    | kelas bersama                         |
| `data/customerValidation.ts`    | data    | `customerFormValues`, tipe nilai form |
| `hooks/useCustomerForm.ts`      | client  | state form                            |
| `index.ts`                      | barrel  | dipakai `ResourcePages`, detail, form |

## Aturan

1. **Statistik customer dihitung di `lib/customers.ts`** (`customerStats`) karena
   `ResourcePages` juga memakainya untuk kolom daftar. Jangan menduplikasi perhitungan.
2. **Data pribadi tetap di server.** Jangan mengirim nomor telepon/alamat ke store atau log.
3. **WhatsApp** memakai `lib/whatsapp.ts`; jangan menyusun URL `wa.me` manual.
4. **Customer tidak dibuat dari dashboard** bila alur produksi berasal dari aplikasi customer;
   form hanya untuk koreksi data yang memang diizinkan backend.
