# Aturan `types/`

Tipe lintas fitur. Tipe yang hanya dipakai satu fitur tinggal di `features/<fitur>/data/`.

## Isi

`index.ts` berisi tipe domain bersama: `RecordData`, `Order`, `Service`, `Staff`, `Customer`,
`Schedule`, `FormState`, `Search`, `Field`, `Resource`.

## Aturan

1. **Tipe murni.** Tanpa import nilai, tanpa fungsi, tanpa JSX.
2. **Satu arah.** `types/` tidak boleh mengimpor `components/`, `features/`, `lib/`, atau
   `store/`.
3. **Tipe baru**: kalau dipakai ≥2 fitur → di sini. Kalau satu fitur → `features/<fitur>/data/`.
4. **`FormState` adalah kontrak form server**: `{ success?, message?, errors?, values? }`.
   Jangan menambah field yang hanya dipakai satu halaman.
5. **Opsionalkan dengan jujur.** Field yang belum tentu dikirim backend diberi `?`; jangan
   memberi nilai palsu di tipe.
6. **Nama file camelCase** selain `index.ts`.
