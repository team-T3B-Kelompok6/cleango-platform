# Aturan `lib/api/`

Satu-satunya pintu transport HTTP. Kontrak backend tidak seragam, jadi normalisasi terjadi
di lapisan ini — bukan di komponen.

## Peta berkas

| Berkas            | Lingkungan | Isi                                                              |
| ----------------- | ---------- | ---------------------------------------------------------------- |
| `apiError.ts`     | keduanya   | `ApiError(message, status, errors?, code?)`                      |
| `apiTypes.ts`     | keduanya   | bentuk kontrak: `{ data: T }`, `{ data: T[] }`, badan galat      |
| `serverApi.ts`    | server     | `upstreamRequest()` — fetch + cookie sesi, timeout 10 dtk        |
| `http.ts`         | server     | helper bertipe: `get/post/patch/put/del<T>()` → `Promise<T>`     |
| `resourceApi.ts`  | server     | `request/list/detail` + mode demo, validasi bentuk daftar/detail |
| `session.ts`      | server     | `readSessionToken`, `hasSession`, `saveSession`, `clearSession`  |
| `logoutAction.ts` | server     | Server Action logout (dipakai layout, bukan milik fitur auth)    |
| `queryClient.ts`  | keduanya   | konfigurasi TanStack Query                                       |
| `index.ts`        | barrel     | ekspor publik untuk `@/lib/api`                                  |

## Aturan

1. **Server Component → `serverApi`/`resourceApi`/`http`.** Token dibaca dari cookie
   HTTP-only (`cleango-session`), tidak pernah dari argumen.
2. **Panggil endpoint lewat helper bertipe**, bukan `fetch`/`request` mentah:
   `get<T>`, `post<T>`, `patch<T>`, `put<T>`, `del<T>` dari `@/lib/api`. `T` adalah bentuk
   respons yang diharapkan, jadi `Promise<T>` langsung bisa dipakai tanpa cast.
   ```ts
   const session = await post<LoginSession>('/auth/login', credentials, {
     anonymous: true,
   });
   ```
   Endpoint publik wajib `anonymous: true` agar 401 tidak memicu redirect ke `/login`.
3. **Respons ber-envelope**: `get<ApiItemEnvelope<Order>>('/orders/1')` lalu ambil `.data`,
   atau pakai `list`/`detail` yang sudah menormalkan `{ data: T }`/`{ data: T[] }`.
4. **Client Component tidak memakai folder ini.** Panggilan browser menuju Route Handler Next
   memakai transport per fitur (`features/cleaner/api/cleanerClientApi.ts`,
   `components/tracking/trackingClientApi.ts`) dengan `fetch`; Route Handler memegang token
   dan meneruskan ke Express. Kalau nanti butuh klien HTTP browser bersama, tambahkan
   modulnya di sini **beserta pemakainya** — jangan menambah seam tanpa konsumen.
5. **Galat selalu `ApiError`.** Status 401 non-anonim → `redirect('/login?expired=1')`;
   404 detail → `notFound()`. Jangan menangani kasus itu di komponen.
6. **Jangan menambah akses `fetch` di luar folder ini.** Kalau butuh endpoint baru, tambahkan
   fungsi di sini (atau di `features/<fitur>/api/` bila hanya satu fitur).
7. **Jangan melemahkan validasi bentuk.** `list()` menolak item tanpa `id`; `detail()`
   menolak `id` yang tidak cocok. Itu yang membuat 502 terdeteksi dini.
8. **Timeout wajib.** `upstreamRequest` memakai `AbortSignal.timeout(10000)`; jangan
   menghapusnya tanpa menggantinya dengan mekanisme setara.
9. **Body helper**: objek/array otomatis `JSON.stringify`; `FormData`, `Blob`, `string`,
   `URLSearchParams`, dan `ArrayBuffer` diteruskan apa adanya. Untuk upload mentah set
   `Content-Type` eksplisit lewat `options.headers`.

## Verifikasi

`npm run typecheck`, `npm run build`, dan `npm run check:uts:http` (perlu backend/emas jika
tersedia). Tanpa backend, `upstreamRequest` hanya bisa dibuktikan sampai pesan 503.
