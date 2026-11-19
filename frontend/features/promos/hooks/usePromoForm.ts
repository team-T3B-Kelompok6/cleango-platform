'use client';
import { useEffect, useState } from 'react';
import type { Service } from '@/types';
import type { Promo } from '@/types/promos';
import {
  filterPromoServices,
  promoBannerUrl,
  promoChoices,
  promoFormValues,
  promoQuote,
  validatePromoBanner,
} from '../data/promoEditor';

/** State form promo: nilai, pilihan layanan, contoh harga, dan banner. */
export function usePromoForm({
  initial,
  services,
  today,
}: {
  initial?: Promo;
  services: Service[];
  today: string;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    promoFormValues(initial, today),
  );
  const [selected, setSelected] = useState<string[]>(initial?.serviceIds ?? []);
  const [query, setQuery] = useState('');
  const [exampleId, setExampleId] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(() =>
    promoBannerUrl(initial),
  );
  const [bannerError, setBannerError] = useState('');

  useEffect(() => {
    if (!bannerFile) {
      setBannerPreview(promoBannerUrl(initial));
      return;
    }
    const url = URL.createObjectURL(bannerFile);
    setBannerPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [bannerFile, initial]);

  function change(name: string, value: string) {
    setValues((current) => ({
      ...current,
      [name]: name === 'code' ? value.toUpperCase() : value,
      ...(name === 'discountType' ? { discountValue: '' } : {}),
    }));
  }

  function selectBanner(file?: File) {
    if (!file) {
      setBannerFile(null);
      setBannerError('');
      return;
    }
    const error = validatePromoBanner(file);
    if (error) {
      setBannerFile(null);
      setBannerError(error);
      return;
    }
    setBannerFile(file);
    setBannerError('');
  }

  function toggleService(id: string, checked: boolean) {
    setSelected((current) =>
      checked ? [...current, id] : current.filter((item) => item !== id),
    );
  }

  const choices = promoChoices(services, values, selected);
  const example =
    choices.find((service) => service.id === exampleId) ??
    choices.find((service) => service.active) ??
    choices[0];
  const quote = promoQuote(values, example);
  const found = filterPromoServices(services, query);

  return {
    values,
    change,
    selected,
    clearSelected: () => setSelected([]),
    toggleService,
    query,
    setQuery,
    found,
    choices,
    example,
    exampleId,
    setExampleId,
    quote,
    bannerFile,
    bannerPreview,
    bannerError,
    selectBanner,
    setBannerPreview,
  };
}
