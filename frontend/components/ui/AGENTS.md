# Aturan `components/ui/`

Primitif presentasional. Tidak tahu halaman, tidak tahu domain, tidak mengambil data.
Diimpor sebagai `@/components/ui/Button` atau lewat barrel `@/components/ui`.

## Daftar saat ini

| Komponen                | Props inti                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| `Button.tsx`            | `variant` (`primary`/`ghost`/`accent`/`danger`), `size` (`sm`/`md`/`lg`), `pending`, `pendingLabel` |
| `buttonVariants.ts`     | `variant`, `size`, `className` → string kelas (aman untuk server component)                         |
| `ConfirmDialog.tsx`     | `label`, `title`, `subtitle`, `message`, `confirmLabel`, `pendingLabel`, `action`                   |
| `Input.tsx`             | semua props `<input>` + `icon`, `trailing`, `invalid`                                               |
| `Label.tsx`             | semua props `<label>`                                                                               |
| `Card.tsx`              | semua props `<section>`                                                                             |
| `Select.tsx`            | semua props `<select>`                                                                              |
| `BrandLogo.tsx`         | `withWordmark`, `size`, `className`                                                                 |
| `Avatar.tsx`            | `children`, `className`                                                                             |
| `IconButton.tsx`        | `label` + semua props `<button>`                                                                    |
| `DialogHeader.tsx`      | `title`, `subtitle`, `icon`, `onClose`, `titleId`                                                   |
| `DialogBody.tsx`        | `children`, `className`                                                                             |
| `DialogFooter.tsx`      | `children`, `className`                                                                             |
| `DialogCloseButton.tsx` | `onClose`, `label`, `className`                                                                     |
| `DialogContext.tsx`     | `DialogCloseContext`, `useDialogClose`                                                              |
| `DialogTrigger.tsx`     | `label`, `title`, `children`, `className`, `dialogClass`, `icon`                                    |
| `DialogNote.tsx`        | `children`                                                                                          |
| `Modal.tsx`             | `title`, `subtitle`, `onClose`, `wide`, `width`, `icon`, `iconTone`, `className`                    |
| `Icon.tsx`              | `name`, `className` (aset SVG di `public/assets`)                                                   |
| `UiIcon.tsx`            | `name`, `style`, `className` (SVG inline)                                                           |
| `CleanGoLogo.tsx`       | `size` (default 40), `className`                                                                    |
| `ButtonLink.tsx`        | `href`, `variant`, `size`, `className`                                                              |
| `EmptyState.tsx`        | `title`, `description`, `action`, `className`                                                       |
| `MetricCard.tsx`        | `label`, `value`, `unit`, `note`, `icon`/`uiIcon`, `tone`, `compactValue`                           |
| `MetricGrid.tsx`        | `columns` (2/3/4), `className`, `children`                                                          |
| `PageHeader.tsx`        | `title`, `description`, `actions`, `align`                                                          |
| `SectionHeading.tsx`    | `title`, `meta`, `action`                                                                           |
| `StatusBadge.tsx`       | `status`, `className`                                                                               |
| `TextLink.tsx`          | `href`, `children`                                                                                  |
| `statusTone.ts`         | fungsi `statusTone(status)` → `{ bg, text }`                                                        |

## Aturan

1. **Hanya presentasi.** Tanpa `fetch`, tanpa server action, tanpa `cookies()`.
2. **Tanpa teks domain.** Label, placeholder, dan judul datang dari props atau `data.ts`
   fitur. Pengecualian: nama brand di `BrandLogo`.
3. **Varian berupa map objek** berisi string kelas lengkap:
   `const variantClass: Record<Variant, string> = { primary: '...', ghost: '...' }`.
   Jangan menyusun kelas dengan `'x ' + y`.
4. **Kelas kondisional memakai `cn()`** dari `lib/cn.ts`.
5. **`'use client'` hanya bila perlu.** `Button` butuh karena `useFormStatus`; `Input`,
   `Label`, `Card`, `Select` tidak.
6. **Aksesibilitas adalah bagian dari API.** `Input` meneruskan `aria-invalid`; `Button`
   memakai `disabled` saat pending; label selalu dihubungkan lewat `htmlFor`/`id`.
7. **Token, bukan hex.** Semua warna/radius/bayangan dari `@theme` (DESIGN.md §9).
8. **Satu file satu komponen**, nama file `.tsx` PascalCase. File non-`.tsx` (mis. konstanta
   atau tipe) memakai camelCase.

## Menambah primitif baru

Syarat: pola yang sama dipakai minimal dua tempat, atau sudah dipakai di satu halaman dan
pasti dipakai lagi. Buat minimal, tanpa prop spekulatif, lalu perbarui tabel di atas dan
`frontend/DESIGN.md` §8 bila mengubah kontrak visual.
