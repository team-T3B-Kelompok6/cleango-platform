# Komponen frontend

Halaman dan layout tetap Server Components. Komponen interaktif yang memiliki state atau event handler memakai `use client`: Navigation, Filters, Notifications, Modal/DialogTrigger, SopDialog, LoginForm dan Form.

ResourcePages menyusun daftar/detail dari API; ResourceFormServer memasok field serta Server Action ke form daun. Data bisnis tidak diambil melalui useEffect. Konten server dapat diteruskan sebagai children ke DialogTrigger tanpa mengubahnya menjadi Client Component.

OrderList, ScheduleList, ServiceList, PeopleList dan FaqList menjaga komposisi tiap halaman terpisah. ReportView adalah Server Component untuk ringkasan periode, metode pembayaran dan pengelompokan laporan. Metadata dan searchParams tetap ditangani page.tsx; semua data awal melalui lib/api.ts.

TrackingButton/TrackingPanel adalah client leaf untuk preview tracking dummy yang diminta pengguna. TrackingMap dimuat dinamis dengan SSR dimatikan di dalam Client Component karena Leaflet memakai DOM. Page/layout tetap RSC. Skenario simulasi dipisahkan di lib/demo/tracking.ts; kontrol hanya mengubah state lokal, tidak memanggil Server Action atau mengubah data API. Tidak ada permintaan izin lokasi atau GPS aktual.
