'use client';
import { useId, useState } from 'react';
import type { Schedule, Staff } from '@/types';
import {
  composeShiftTime,
  scheduleFormValues,
  scheduleStaffOptions,
} from '@/lib/schedules';

/** State form tambah/ubah jadwal: nilai awal, slot shift, dan opsi petugas. */
export function useScheduleEditor({
  schedule,
  staff,
}: {
  schedule?: Schedule;
  staff: Staff[];
}) {
  const uid = useId();
  const [values, setValues] = useState<Record<string, string>>(() =>
    scheduleFormValues({ schedule, staff }),
  );

  function set(name: string, value: string) {
    setValues((previous) => ({ ...previous, [name]: value }));
  }

  function setStart(start: string) {
    setValues((previous) => ({
      ...previous,
      start,
      time: composeShiftTime(start, previous.end),
    }));
  }

  function setEnd(end: string) {
    setValues((previous) => ({
      ...previous,
      end,
      time: composeShiftTime(previous.start, end),
    }));
  }

  return {
    uid,
    values,
    set,
    setStart,
    setEnd,
    person: staff.find((person) => person.name === values.staff),
    options: scheduleStaffOptions(staff, schedule?.staff),
  };
}
