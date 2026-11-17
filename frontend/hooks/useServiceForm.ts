'use client';
import { useEffect, useRef, useState } from 'react';
import type { RecordData } from '@/types';
import {
  composeFeaturePayload,
  serviceFormValues,
  validateServiceImage,
  type FeatureDraft,
} from '@/lib/service-form';

/** State form layanan: isian, foto (drag & drop), dan daftar fasilitas. */
export function useServiceForm({
  initial,
  categories,
}: {
  initial: Partial<RecordData>;
  categories: string[];
}) {
  const defaults = serviceFormValues(initial, categories);
  const fileInput = useRef<HTMLInputElement>(null);
  const nextFeature = useRef(1000);
  const [name, setName] = useState(defaults.name);
  const [category, setCategory] = useState(defaults.category);
  const [duration, setDuration] = useState(defaults.duration);
  const [description, setDescription] = useState(defaults.description);
  const [price, setPrice] = useState(defaults.price);
  const [active, setActive] = useState(defaults.active);
  const [features, setFeatures] = useState<FeatureDraft[]>(defaults.features);
  const [file, setFile] = useState<File | null>(null);
  const [removed, setRemoved] = useState(false);
  const [preview, setPreview] = useState(String(initial.imageUrl ?? ''));
  const [imageError, setImageError] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setImageFailed(false);
    if (!file) {
      setPreview(removed ? '' : String(initial.imageUrl ?? ''));
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, removed, initial.imageUrl]);

  function selectFile(selected?: File) {
    if (!selected) return;
    const error = validateServiceImage(selected);
    if (error) {
      setImageError(error);
      if (fileInput.current) fileInput.current.value = '';
      return;
    }
    setImageError('');
    setFile(selected);
    setRemoved(false);
  }

  function removeImage() {
    setFile(null);
    setRemoved(true);
    setImageError('');
    if (fileInput.current) fileInput.current.value = '';
  }

  function addFeature() {
    const key = nextFeature.current++;
    setFeatures((items) => [...items, { key, value: '' }]);
  }

  function setFeature(key: number, value: string) {
    setFeatures((items) =>
      items.map((item) => (item.key === key ? { ...item, value } : item)),
    );
  }

  function removeFeature(key: number) {
    setFeatures((items) => items.filter((item) => item.key !== key));
  }

  return {
    name,
    setName,
    category,
    setCategory,
    duration,
    setDuration,
    description,
    setDescription,
    price,
    setPrice,
    active,
    setActive,
    features,
    addFeature,
    setFeature,
    removeFeature,
    file,
    removed,
    preview,
    imageError,
    imageFailed,
    setImageFailed,
    dragging,
    setDragging,
    fileInput,
    selectFile,
    removeImage,
    featurePayload: () => composeFeaturePayload(features),
  };
}
