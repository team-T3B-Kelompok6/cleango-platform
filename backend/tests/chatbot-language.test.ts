import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import {
  chatSearchText,
  chatTokens,
  normalizeChatText,
  smallTalkReply,
} from '../src/lib/chatbot-text.js';
import { knowledgeFor } from '../src/lib/chatbot-knowledge.js';
import { orderReferenceIn } from '../src/lib/chatbot.js';
import { chat } from '../src/controller/chatbot.controller.js';

describe('bounded chat language normalization', () => {
  it.each([
    ['BHai', 'hai'],
    ['haaaai', 'hai'],
    ['hargaaa', 'harga'],
    ['gmn hrga deep clening', 'bagaimana harga deep cleaning'],
    ['sy blm byr', 'saya belum bayar'],
    ['pesenanku', 'pesanan saya'],
    ['clener terlmbat', 'cleaner terlambat'],
    ['prmo voucer', 'promo voucher'],
    ['di kos', 'di kost'],
    ['otpku', 'otp saya'],
  ])('normalizes only known variants: %s', (message, expected) => {
    expect(chatSearchText(message)).toBe(expected);
  });
  it.each([
    'CL-HRGA-0001',
    'HEMAT2026',
    'Rp150.000',
    'gsk_fake_test',
    'unknown-new-service',
  ])(
    'does not spell-correct identifiers, numbers or unknown names: %s',
    (value) => {
      expect(chatSearchText(value)).toBe(value.toLowerCase());
    },
  );
  it('normalizes invisible/fullwidth text but retains the exact order reference for SQL', () => {
    expect(normalizeChatText(' ＣｌｅａｎＧｏ\u200b\n ')).toBe('CleanGo');
    expect(orderReferenceIn('sttus pesenanku CL-HRGA-0001')).toBeUndefined();
    expect(orderReferenceIn('sttus pesenanku CL-123HRGA')).toBe('CL-123HRGA');
    expect(chatTokens('cara cuci AC?')).toContain('ac');
  });
  it.each([
    'bhai',
    'hai',
    'mulai',
    'santai',
    'pandai',
    'ramai',
    'halaman',
    'kotak',
    'acara',
  ])('never matches unrelated word fragments: %s', (message) => {
    const ids = knowledgeFor(message).map((source) => source.id);
    expect(ids).not.toContain('knowledge:eta');
    expect(ids).not.toContain('knowledge:privacy');
    expect(ids).not.toContain('knowledge:region');
    expect(ids).not.toContain('knowledge:service');
  });
  it.each([
    ['apa itu AI?', 'knowledge:ai'],
    ['gmn cara boking?', 'knowledge:booking'],
    ['hrga deep clening', 'knowledge:price'],
    ['prmo voucer', 'knowledge:promo'],
    ['cara membatalkan', 'knowledge:policy'],
    ['bayar qirs', 'knowledge:payment'],
    ['traking gps', 'knowledge:tracking'],
    ['clener terlmbat', 'knowledge:delay'],
    ['setrika tersedia?', 'knowledge:service'],
    ['cara login?', 'knowledge:account'],
    ['lupa kata sandi', 'knowledge:account'],
    ['arti sttus dikerjain', 'knowledge:status'],
  ])('retrieves a relevant source: %s', (message, expected) => {
    expect(knowledgeFor(message).map((source) => source.id)).toContain(
      expected,
    );
  });
  it.each([
    'hai, harga deep cleaning?',
    'halo saya mau booking',
    'makasih, ada promo?',
  ])('does not discard a real question after a greeting: %s', (message) => {
    expect(smallTalkReply(message)).toBeNull();
  });
  it('handles acknowledgement without calling it a new ETA question', () => {
    expect(smallTalkReply('makasih boo')).toContain('Sama-sama');
    expect(chatSearchText('10 km')).toBe('10 km');
  });
});

describe('normalized request boundary', () => {
  it.each([
    { message: '\u200b\uFEFF' },
    { message: 'ﬃ'.repeat(700) },
    { message: 'halo', history: [{ role: 'user', content: '\u200b' }] },
    { message: 'halo', history: [{ role: 'user', content: 'ﬃ'.repeat(700) }] },
  ])(
    'rejects empty or expanded Unicode input before any model/query',
    async (body) => {
      const next = vi.fn();
      await chat({ body } as Request, {} as Response, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 }),
      );
    },
  );
});
