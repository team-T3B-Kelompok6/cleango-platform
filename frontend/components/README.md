# Komponen frontend

Halaman dan layout tetap Server Components. Komponen interaktif yang memiliki state atau event handler memakai `use client`: Navigation, Filters, Notifications, Modal/DialogTrigger, SopDialog, LoginForm dan Form.

ResourcePages menyusun daftar/detail dari API; ResourceFormServer memasok field serta Server Action ke form daun. Data bisnis tidak diambil melalui useEffect. Konten server dapat diteruskan sebagai children ke DialogTrigger tanpa mengubahnya menjadi Client Component.

DeleteRecordButton menyatukan dialog konfirmasi nama/ID dan Server Action penghapusan pada keenam resource. `canCreate` di konfigurasi resource membatasi form dan Server Action tambah hanya untuk layanan, FAQ, customer, dan petugas.

OrderList, ScheduleList, ServiceList, PeopleList dan FaqList menjaga komposisi tiap halaman terpisah. ReportView adalah Server Component untuk ringkasan periode, metode pembayaran dan pengelompokan laporan. Metadata dan searchParams tetap ditangani page.tsx; semua data awal melalui lib/api.ts.

TrackingButton/TrackingPanel menangani dialog penugasan dan lokasi terakhir petugas melalui `/api/admin/cleaner-tasks`. Lokasi berasal dari halaman tugas cleaner; ETA memakai rute OSRM dan risiko memakai aturan jadwal. Mode demo yang masih aktif tetap memakai `lib/cleaner/demo-store.ts`, bukan peta simulasi lama. Page/layout tetap RSC.
