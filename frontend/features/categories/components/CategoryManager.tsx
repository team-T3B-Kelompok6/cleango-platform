'use client';
import type { ReactNode } from 'react';
import type { Category } from '@/types';
import { buttonVariants } from '@/components/ui';
import { DialogTrigger } from '@/components/ui/DialogTrigger';
import { CategoryForm } from './CategoryForm';
import { CategoryPicker } from './CategoryPicker';
import { managerActionsClass, managerBarClass } from '../data/categoryStyles';
import type { ManagedCategory } from '../data/categoryTypes';

/** Bar pengelola kategori di atas daftar layanan/FAQ. */
export function CategoryManager({
  resource,
  count,
  categories = [],
  children,
}: {
  resource: Category['resource'];
  count: number;
  categories?: ManagedCategory[];
  children?: ReactNode;
}) {
  return (
    <div className={managerBarClass}>
      <span>
        {count} kategori {resource === 'services' ? 'layanan' : 'FAQ'}
      </span>
      <div className={managerActionsClass}>
        {children}
        {resource === 'services' && (
          <DialogTrigger
            label="Kelola kategori"
            title="Kelola Kategori Layanan"
            icon="edit"
            dialogWidth={480}
            className={buttonVariants({ variant: 'ghost', className: 'gap-8' })}
          >
            <CategoryPicker categories={categories} />
          </DialogTrigger>
        )}
        <DialogTrigger
          label="Tambah kategori"
          title={
            'Tambah Kategori ' + (resource === 'services' ? 'Layanan' : 'FAQ')
          }
          icon="plus"
          dialogWidth={480}
          className={buttonVariants({
            variant: 'ghost',
            className: 'gap-8 text-accent',
          })}
        >
          <CategoryForm resource={resource} />
        </DialogTrigger>
      </div>
    </div>
  );
}
