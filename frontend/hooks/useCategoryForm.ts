'use client';
import { useEffect, useRef, useState } from 'react';
import { validateCategoryIcon } from '@/lib/category-form';

/** State form kategori: nama, ikon, pratinjau, dan mode hapus. */
export function useCategoryForm({
  name: initialName = '',
  iconSrc = '',
}: {
  name?: string;
  iconSrc?: string | null;
} = {}) {
  const [name, setName] = useState(initialName);
  const [deleting, setDeleting] = useState(false);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState(iconSrc ?? '');
  const [iconRemoved, setIconRemoved] = useState(false);
  const [iconError, setIconError] = useState('');
  const iconInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!iconFile) {
      setIconPreview(iconRemoved ? '' : (iconSrc ?? ''));
      return;
    }
    const url = URL.createObjectURL(iconFile);
    setIconPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [iconFile, iconRemoved, iconSrc]);

  function selectIcon(file?: File) {
    if (!file) return;
    const error = validateCategoryIcon(file);
    if (error) {
      setIconError(error);
      if (iconInput.current) iconInput.current.value = '';
      return;
    }
    setIconError('');
    setIconRemoved(false);
    setIconFile(file);
  }

  function removeIcon() {
    setIconFile(null);
    setIconRemoved(true);
    setIconError('');
    if (iconInput.current) iconInput.current.value = '';
  }

  return {
    name,
    setName,
    deleting,
    setDeleting,
    iconFile,
    iconPreview,
    iconRemoved,
    iconError,
    iconInput,
    selectIcon,
    removeIcon,
  };
}
