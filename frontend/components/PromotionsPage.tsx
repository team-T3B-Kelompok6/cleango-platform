import { listBanners } from '@/lib/banners';
import { deleteBanner } from '@/app/banner-actions';
import Link from 'next/link';
import { DialogTrigger } from './DialogTrigger';
import { BannerForm } from './BannerForm';
import { AddBannerButton } from './AddBannerButton';
import { DeleteForm } from './Form';
import type { Search } from '@/types';
import Image from 'next/image';
export function ServiceNavigation({ promos = false }: { promos?: boolean }) {
  return (
    <nav className="service-navigation" aria-label="Pengelolaan layanan">
      <Link href="/layanan" aria-current={!promos ? 'page' : undefined}>
        Daftar layanan
      </Link>
      <Link
        href="/layanan?view=promos"
        aria-current={promos ? 'page' : undefined}
      >
        Promo beranda
      </Link>
    </nav>
  );
}
export async function PromotionsPage({ search }: { search: Search }) {
  const banners = await listBanners();
  return (
    <div className="resource-page resource-promotions">
      <div className="page-title admin-heading">
        <div>
          <h1>Promo Beranda</h1>
          <p>Kelola gambar banner promo untuk home aplikasi.</p>
        </div>
        <AddBannerButton />
      </div>
      <ServiceNavigation promos />
      {search.saved && (
        <p className="form-success" role="status">
          Banner berhasil disimpan.
        </p>
      )}
      {search.deleted && (
        <p className="form-success" role="status">
          Banner berhasil dihapus.
        </p>
      )}
      <p className="promo-list-note">{banners.length} gambar banner</p>
      <div className="promo-grid">
        {banners.map((banner) => (
          <article className="promo-card" key={banner.id}>
            <Image
              width={1200}
              height={400}
              unoptimized
              className="promo-banner"
              src={banner.imageUrl}
              alt="Banner promo home aplikasi"
            />
            <div className="managed-record-footer">
              <div className="figma-row-actions record-rud">
                <DialogTrigger
                  label="Ganti Gambar"
                  title="Ganti Gambar Banner"
                  wide
                  icon="edit"
                >
                  <BannerForm banner={banner} />
                </DialogTrigger>
                <DialogTrigger label="Lihat Banner" title="Banner Promo" wide>
                  <div className="modal-body">
                    <Image
                      width={1200}
                      height={400}
                      unoptimized
                      className="promo-banner"
                      src={banner.imageUrl}
                      alt="Banner promo home aplikasi"
                    />
                  </div>
                </DialogTrigger>
                <DialogTrigger
                  label="Hapus Banner"
                  title="Hapus Banner Promo"
                  className="icon-action record-delete"
                  icon="trash"
                >
                  <DeleteForm
                    action={deleteBanner.bind(null, banner.id)}
                    name={'banner ' + banner.id}
                  />
                </DialogTrigger>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!banners.length && (
        <section className="empty-state">
          <h3>Belum ada banner promo</h3>
          <p>
            Gunakan tombol Tambah Banner Promo untuk mengunggah gambar pertama.
          </p>
        </section>
      )}
    </div>
  );
}
