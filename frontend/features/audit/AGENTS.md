# Aturan `features/audit/`

Audit Log Admin: riwayat perubahan data oleh admin.

## Isi

| Berkas                             | Lapisan | Isi                                                       |
| ---------------------------------- | ------- | --------------------------------------------------------- |
| `api/auditApi.ts`                  | server  | `listAuditLogs()` — panggil backend + normalisasi halaman |
| `data/auditCopy.ts`                | data    | `AUDIT_COPY` + kelas panel                                |
| `pages/AuditPage.tsx`              | server  | baca filter, ambil halaman, tentukan status, rakit UI     |
| `components/AuditFilterBar.tsx`    | server  | filter GET (`next/form`)                                  |
| `components/AuditMetrics.tsx`      | server  | metrik ringkas                                            |
| `components/AuditList.tsx`         | server  | daftar entri                                              |
| `components/AuditEntry.tsx`        | server  | satu entri + dialog detail                                |
| `components/AuditDetailDialog.tsx` | client  | detail perubahan sebelum/sesudah                          |
| `components/AuditActionBadge.tsx`  | server  | label aksi                                                |
| `components/AuditState.tsx`        | server  | state kosong/galat                                        |
| `index.ts`                         | barrel  | dipakai `app/(admin)/audit-log/page.tsx`                  |

## Aturan

1. **Perhitungan filter/paginasi/label tetap di `lib/audit.ts`** karena juga dipakai
   `lib/demo/audit-store.ts` dan `lib/audit-api`. Jangan memindahkan atau menyalinnya.
2. **Status galat dipetakan `auditIssue()`**, bukan `instanceof` di komponen.
3. **Filter memakai GET**, bukan state client, agar tautan bisa dibagikan.
4. **Jangan menampilkan data sensitif** (nomor telepon, alamat, foto) di dialog audit;
   backend sudah mengirim snapshot yang diizinkan.
5. **Uji lewat `npm run check:audit`** setiap mengubah filter, label, atau paginasi.
