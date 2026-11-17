import type { Order, RecordData, Schedule, Service, Staff } from '@/types';
import {
  activeOrderForStaff,
  recommendedSkills,
  staffOperationalStatus,
} from './staff-availability';
import { assignmentIssue } from './staff-schedules';
import { serviceSkillOptions } from './staff-skills';
import { whatsappLink } from './whatsapp';

/** Nilai jadi untuk profil petugas di dialog detail. */
export type StaffDetailView = {
  status: string;
  phone: string;
  href: string | null;
  task?: Order;
  scheduleCount: number | null;
  dataAvailable: boolean;
};

export type StaffMentor = { id: string; name: string };

export type StaffFormOptions = {
  skillOptions: string[];
  previousSkills: string[];
  mentors: StaffMentor[];
};

export type StaffAssignment = {
  candidates: { name: string; skills: string[]; photoUrl: unknown }[];
  recommended: string[];
};

const ASSIGNMENT_MESSAGE =
  ', saya Admin CleanGo. Saya ingin berkoordinasi mengenai tugas Anda.';

/** Keahlian petugas yang valid (string tidak kosong). */
export function staffSkills(staff: Pick<Staff, 'skills'> | RecordData) {
  return Array.isArray(staff.skills)
    ? staff.skills.filter(
        (skill): skill is string =>
          typeof skill === 'string' && skill.trim().length > 0,
      )
    : [];
}

/** Status operasional untuk daftar; jatuh ke label status bila belum dihitung. */
export function staffStatusLabel(item: RecordData) {
  if (typeof item.operationalStatus === 'string') return item.operationalStatus;
  if (item.status === 'Tersedia') return 'Siaga & Tersedia';
  if (item.status === 'Bertugas') return 'Sedang Bekerja';
  return String(item.status ?? '');
}

/** Jadwal milik satu petugas (kolom `staff` bisa berisi beberapa nama). */
export function staffAssignedSchedules(schedules: Schedule[], name: string) {
  return schedules.filter(
    (schedule) =>
      typeof schedule.staff === 'string' &&
      schedule.staff
        .split(' & ')
        .map((value) => value.trim())
        .includes(name),
  );
}

/** Tanggal singkat WIB, mis. "13 Nov 2026". */
export function shortDate(value: unknown) {
  if (
    typeof value !== 'string' ||
    !value ||
    !Number.isFinite(Date.parse(value))
  )
    return 'Belum tersedia';
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
}

/** Gabungkan petugas dengan status operasionalnya dari pesanan berjalan. */
export function withOperationalStatus(records: RecordData[], orders: Order[]) {
  return records.map((person) => ({
    ...person,
    operationalStatus: staffOperationalStatus(person as Staff, orders),
  }));
}

/** Tab daftar petugas; tab "Nonaktif" hanya muncul bila ada petugas nonaktif. */
export function staffTabs(
  records: RecordData[],
  baseTabs: string[] | undefined,
  activeTab: string,
) {
  const tabs = baseTabs ?? [];
  const hasInactive =
    records.some((person) => person.status === 'Nonaktif') ||
    activeTab === 'Nonaktif';
  return hasInactive ? [...new Set([...tabs, 'Nonaktif'])] : tabs;
}

/** Ringkasan kartu metrik halaman petugas. */
export function staffSummary(records: RecordData[]) {
  return {
    active: records.filter(
      (item) => !['Masa Training', 'Nonaktif'].includes(String(item.status)),
    ).length,
    available: records.filter(
      (item) => item.operationalStatus === 'Siaga & Tersedia',
    ).length,
    working: records.filter((item) =>
      ['Menuju Lokasi', 'Sedang Bekerja', 'Bertugas'].includes(
        String(item.operationalStatus),
      ),
    ).length,
  };
}

/** Data profil petugas: status, tugas aktif, kontak, jadwal, ketersediaan data. */
export function staffDetailView({
  staff,
  orders,
  schedules,
}: {
  staff: Staff;
  orders: Order[] | null;
  schedules: Schedule[] | null;
}): StaffDetailView {
  const task = orders ? activeOrderForStaff(staff, orders) : undefined;
  const status = staffOperationalStatus(staff, orders ?? []);
  const phone = typeof staff.phone === 'string' ? staff.phone : '';
  const href = staff.id.startsWith('DEMO-')
    ? null
    : whatsappLink(phone, 'Halo ' + staff.name + ASSIGNMENT_MESSAGE);
  return {
    status,
    phone,
    href,
    task,
    scheduleCount: schedules
      ? staffAssignedSchedules(schedules, staff.name).length
      : null,
    dataAvailable: orders !== null && schedules !== null,
  };
}

/** Opsi form petugas: keahlian dari layanan aktif, keahlian lama, dan mentor. */
export function staffFormOptions({
  staff,
  services,
  record,
}: {
  staff: Staff[];
  services: Service[];
  record?: RecordData;
}): StaffFormOptions {
  const skillOptions = serviceSkillOptions(services);
  const previousSkills = Array.isArray(record?.skills)
    ? record.skills.filter(
        (skill): skill is string =>
          typeof skill === 'string' && !skillOptions.includes(skill),
      )
    : [];
  return {
    skillOptions,
    previousSkills,
    mentors: staff
      .filter(
        (person) =>
          person.id !== record?.id &&
          ['Tersedia', 'Bertugas'].includes(person.status),
      )
      .map((person) => ({ id: person.id, name: person.name })),
  };
}

/** Kandidat petugas untuk penugasan pesanan, diurutkan dari keahlian paling cocok. */
export function assignmentCandidates({
  staff,
  order,
  schedules,
  orders,
}: {
  staff: Staff[];
  order: Order;
  schedules: Schedule[];
  orders: Order[];
}): StaffAssignment {
  const ownDemoSpace = (person: Staff) =>
    person.id.startsWith('DEMO-') === order.id.startsWith('DEMO-');
  const candidates = staff
    .filter(ownDemoSpace)
    .filter((person) => !assignmentIssue(person, order, schedules, orders))
    .sort(
      (a, b) =>
        recommendedSkills(b, order).length -
          recommendedSkills(a, order).length || a.name.localeCompare(b.name),
    );
  return {
    candidates: candidates.map((person) => ({
      name: person.name,
      skills: staffSkills(person),
      photoUrl: person.photoUrl,
    })),
    recommended: candidates
      .filter((person) => recommendedSkills(person, order).length > 0)
      .map((person) => person.name),
  };
}
