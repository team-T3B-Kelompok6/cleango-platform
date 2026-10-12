'use client';
import { useState } from 'react';
import { Modal } from './Modal';

type Step = 'Ringkasan' | 'Persiapan' | 'Pengerjaan' | 'Serah terima';
const steps: Step[] = ['Ringkasan', 'Persiapan', 'Pengerjaan', 'Serah terima'];

const sections = [
  {
    tab: 'Persiapan' as const,
    number: '01',
    title: 'Sebelum mulai',
    hint: 'Pastikan lokasi, alat, dan pelanggan sudah siap.',
    items: [
      'Tiba di lokasi 15 menit sebelum jadwal.',
      'Konfirmasi area kerja dan kebutuhan pelanggan.',
      'Periksa alat, gunakan pelindung diri, lalu foto kondisi awal.',
    ],
  },
  {
    tab: 'Pengerjaan' as const,
    number: '02',
    title: 'Saat pengerjaan',
    hint: 'Kerjakan per area dengan alat yang sesuai.',
    items: [
      'Bersihkan dari bagian atas ke bawah agar debu tidak jatuh ke area yang sudah rapi.',
      'Pisahkan alat untuk kamar mandi dan area lainnya.',
      'Gunakan takaran produk sesuai petunjuk, terutama pada permukaan sensitif.',
    ],
  },
  {
    tab: 'Serah terima' as const,
    number: '03',
    title: 'Sebelum meninggalkan lokasi',
    hint: 'Periksa hasil bersama pelanggan.',
    items: [
      'Lengkapi checklist dan dokumentasikan hasil akhir.',
      'Tunjukkan area yang telah dikerjakan kepada pelanggan.',
      'Catat masukan atau pekerjaan susulan sebelum menutup pesanan.',
    ],
  },
];

export function SopDialog({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState<Step>('Ringkasan');
  const visible =
    active === 'Ringkasan'
      ? sections.slice(0, 2)
      : sections.filter((section) => section.tab === active);
  return (
    <Modal
      title="Panduan kerja lapangan"
      subtitle="SOP kebersihan Cleango · Berlaku untuk setiap pesanan"
      onClose={onClose}
      className="sop-dialog"
    >
      <div className="dialog-tabs" role="tablist" aria-label="Tahapan SOP">
        {steps.map((step) => (
          <button
            key={step}
            type="button"
            role="tab"
            aria-selected={active === step}
            tabIndex={active === step ? 0 : -1}
            onKeyDown={(event) => {
              const index = steps.indexOf(step);
              const next =
                event.key === 'ArrowRight'
                  ? (index + 1) % steps.length
                  : event.key === 'ArrowLeft'
                    ? (index + steps.length - 1) % steps.length
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? steps.length - 1
                        : -1;
              if (next >= 0) {
                event.preventDefault();
                setActive(steps[next]);
                const buttons =
                  event.currentTarget.parentElement?.querySelectorAll('button');
                buttons?.[next]?.focus();
              }
            }}
            className={active === step ? 'active' : ''}
            onClick={() => setActive(step)}
          >
            {step}
          </button>
        ))}
      </div>
      <div
        className={`sop-content ${active === 'Ringkasan' ? 'summary' : ''}`}
        role="tabpanel"
      >
        <div className="sop-facts" aria-label="Poin penting SOP">
          <div>
            <strong>15 menit</strong>
            <span>Datang sebelum jadwal</span>
          </div>
          <div>
            <strong>Terpisah</strong>
            <span>Alat untuk kamar mandi</span>
          </div>
          <div>
            <strong>Wajib</strong>
            <span>Checklist & foto hasil</span>
          </div>
        </div>
        <div className={`sop-steps ${visible.length === 1 ? 'single' : ''}`}>
          {visible.map((section) => (
            <section className="sop-step" key={section.number}>
              <div className="sop-step-heading">
                <span className="sop-step-number">{section.number}</span>
                <div>
                  <h3>{section.title}</h3>
                  <p>{section.hint}</p>
                </div>
              </div>
              <ol>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </section>
          ))}
        </div>
        <p className="sop-note">
          <strong>Serah terima:</strong> lengkapi checklist, tunjukkan hasil
          kepada pelanggan, lalu catat masukan atau kendala di pesanan.
        </p>
      </div>
      <div className="modal-footer sop-footer">
        <span>Disiapkan untuk tim operasional Cleango</span>
        <button className="button primary" onClick={onClose}>
          Selesai membaca
        </button>
      </div>
    </Modal>
  );
}
