import { DialogTrigger } from './DialogTrigger';
import { BannerForm } from './BannerForm';
export function AddBannerButton() {
  return (
    <DialogTrigger
      label="Tambah Banner Promo"
      title="Tambah Banner Promo"
      icon="plus"
      className="button banner-add"
      wide
    >
      <BannerForm />
    </DialogTrigger>
  );
}
