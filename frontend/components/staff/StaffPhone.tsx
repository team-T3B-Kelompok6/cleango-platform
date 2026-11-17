'use client';
import { useState } from 'react';
import { UiIcon } from '@/components/shared/ui';

/** Nomor WhatsApp petugas + tombol salin tautan. */
export function StaffPhone({
  phone,
  href,
}: {
  phone: string;
  href: string | null;
}) {
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  async function copyLink() {
    if (!href) return;
    try {
      await navigator.clipboard.writeText(href);
      setCopied('copied');
    } catch {
      setCopied('failed');
    }
  }
  return (
    <div>
      <div className="flex items-center gap-5 text-sm leading-[1.65] break-words text-ink-muted">
        <UiIcon name="phone" className="size-[14px]" />
        <span>{phone.trim() || 'Nomor belum ditambahkan'}</span>
        {href && (
          <button
            className="grid size-30 shrink-0 place-items-center rounded-[7px] text-accent hover:bg-accent-soft"
            type="button"
            onClick={copyLink}
            aria-label="Salin tautan WhatsApp"
            title="Salin tautan WhatsApp"
          >
            <UiIcon
              name={copied === 'copied' ? 'tick' : 'copy'}
              className="size-[15px]"
            />
          </button>
        )}
      </div>
      {copied !== 'idle' && (
        <small
          role="status"
          className="block text-xs leading-[1.55] text-ink-muted"
        >
          {copied === 'copied'
            ? 'Tautan WhatsApp disalin.'
            : 'Tautan belum bisa disalin. Gunakan tombol Hubungi WhatsApp.'}
        </small>
      )}
      {!href && (
        <small className="block text-xs leading-[1.55] text-warning">
          WhatsApp belum terhubung untuk kontak ini.
        </small>
      )}
    </div>
  );
}
