'use client';
import { useState } from 'react';
import type { RecordData } from '@/types';
import {
  isStaffTraining,
  staffFormValues,
  type StaffFormValues,
} from '../data/staffFormPayload';

/** State form tambah/ubah petugas, termasuk pemilihan keahlian dan foto. */
export function useStaffForm({ initial }: { initial?: RecordData }) {
  const [values, setValues] = useState<StaffFormValues>(() =>
    staffFormValues(initial),
  );
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [photoInvalid, setPhotoInvalid] = useState(false);

  function set<K extends keyof StaffFormValues>(
    name: K,
    value: StaffFormValues[K],
  ) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function toggleSkill(skill: string, checked: boolean) {
    setValues((current) => ({
      ...current,
      skills: checked
        ? [...new Set([...current.skills, skill])]
        : current.skills.filter((item) => item !== skill),
    }));
  }

  return {
    values,
    set,
    toggleSkill,
    training: isStaffTraining(values),
    photo,
    photoRemoved,
    photoInvalid,
    selectPhoto(file: File) {
      setPhoto(file);
      setPhotoRemoved(false);
    },
    removePhoto() {
      setPhoto(null);
      setPhotoRemoved(true);
    },
    setPhotoInvalid,
  };
}
