import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import sharp from 'sharp';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

const mocks = vi.hoisted(() => ({ vision: vi.fn() }));
vi.mock('../src/lib/groq-vision.js', () => ({ analyzeWithGroq: mocks.vision }));
vi.mock('../src/middleware/auth.middleware.js', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    if (req.headers.authorization) {
      req.user = {
        id: Number(req.headers.authorization.slice(7)),
        role: 'customer',
      };
      next();
    } else
      next(
        Object.assign(new Error('Authentication diperlukan'), {
          statusCode: 401,
        }),
      );
  },
  requireCustomer: (_req: any, _res: any, next: any) => next(),
}));
vi.mock('../src/config/env.js', () => ({
  getEnv: () => ({ CHATBOT_VISION_ENABLED: true }),
}));
import { createPhotoRouter } from '../src/routes/customer/photo.routes.js';
import { normalizePhoto } from '../src/lib/photo-image.js';
import {
  parsePhotoAnalysis,
  photoAnalysisResult,
} from '../src/lib/photo-analysis.js';

const analysis = {
  cleanliness: 'moderate',
  tidiness: 'unknown',
  observations: 'visible_dirt',
  confidence: 'high',
};
const app = () => {
  const server = express();
  server.use('/api/customer/chat/analyze-image', createPhotoRouter());
  server.use((error: any, _req: any, res: any, _next: any) =>
    res
      .status(error.statusCode ?? 500)
      .json({ message: error.message, code: error.code }),
  );
  return server;
};
let user = 0;
const post = (
  server: ReturnType<typeof app> | http.Server,
  bytes: Buffer,
  mime = 'image/png',
  id = ++user,
) =>
  request(server)
    .post('/api/customer/chat/analyze-image')
    .set('Authorization', `Bearer ${id}`)
    .set('Content-Type', mime)
    .send(bytes);
const png = () =>
  sharp({ create: { width: 32, height: 32, channels: 3, background: 'white' } })
    .png()
    .toBuffer();
beforeEach(() => {
  vi.clearAllMocks();
  mocks.vision.mockResolvedValue(analysis);
});

describe('photo cleanliness analysis', () => {
  it.each(['light', 'moderate', 'heavy'] as const)(
    'analyzes %s dirt without recommendations',
    (cleanliness) => {
      const result = photoAnalysisResult(
        parsePhotoAnalysis({ ...analysis, cleanliness, tidiness: 'cluttered' }),
      );
      expect(result).toEqual({
        status: 'analyzed',
        reply:
          'Foto menunjukkan kondisi cukup jelas. Penilaian ini hanya berdasarkan bagian yang terlihat.',
        analysis: {
          cleanliness,
          tidiness: 'cluttered',
          observations: 'Kotoran tampak pada foto.',
          confidence: 'high',
        },
      });
    },
  );
  it.each([
    { confidence: 'low' },
    { cleanliness: 'unknown' },
    { observations: 'unclear' },
  ])('clarifies uncertain condition %j', (extra) => {
    const result = photoAnalysisResult(
      parsePhotoAnalysis({ ...analysis, ...extra }),
    );
    expect(result.status).toBe('needs_clarification');
    expect(result.analysis.cleanliness).toBe('unknown');
    expect(result.analysis.tidiness).toBe('unknown');
    expect(result.reply).toMatch(/lebih terang dan fokus|belum cukup yakin/i);
  });
  it('shows medium as tentative only with matching visible dirt evidence', () => {
    const result = photoAnalysisResult(parsePhotoAnalysis({ ...analysis, confidence: 'medium' }));
    expect(result.status).toBe('analyzed');
    expect(result.analysis.cleanliness).toBe('moderate');
    expect(result.reply).toMatch(/perkiraan/i);
    expect(result.analysis.tidiness).toBe('unknown');
  });
  it.each([
    { observations: 'visible_clutter' },
    { observations: 'no_visible_dirt' },
    { cleanlinessReason: 'unclear' },
    { cleanlinessReason: 'no_visible_dirt' },
  ])('does not lower confidence gate without dirt evidence %j', (extra) => {
    expect(photoAnalysisResult(parsePhotoAnalysis({ ...analysis, confidence: 'medium', ...extra })).status).toBe('needs_clarification');
  });
  it('accepts no visible dirt as light, not proof of cleanliness', () => {
    const result = photoAnalysisResult(parsePhotoAnalysis({ ...analysis, cleanliness: 'light', confidence: 'medium', observations: 'no_visible_dirt', cleanlinessReason: 'no_visible_dirt', tidinessReason: 'not_applicable' }));
    expect(result.status).toBe('analyzed');
    expect(result.analysis.cleanlinessReason).toBe('no_visible_dirt');
    expect(result.analysis.tidinessReason).toBe('not_applicable');
    expect(result.analysis.observations).toMatch(/bukan jaminan/);
  });
  it.each(['high', 'medium'] as const)('abstains from contradictory dirt evidence at %s confidence', (confidence) => {
    for (const [cleanliness, cleanlinessReason] of [
      ['moderate', 'no_visible_dirt'], ['heavy', 'small_dirt_patches'],
      ['light', 'widespread_dirt'], ['moderate', 'dirt_buildup'],
    ]) {
      const result = photoAnalysisResult(parsePhotoAnalysis({ ...analysis, confidence, cleanliness, cleanlinessReason }));
      expect(result.status).toBe('needs_clarification');
      expect(result.analysis.cleanliness).toBe('unknown');
      expect(result.analysis.cleanlinessReason).toBe('unclear');
      expect(result.analysis.observations).toBe('Kotoran tampak pada foto.');
    }
    const result = photoAnalysisResult(parsePhotoAnalysis({ ...analysis, confidence, observations: 'no_visible_dirt' }));
    expect(result.status).toBe('needs_clarification');
    expect(result.analysis.observations).toMatch(/Tidak tampak kotoran/);
  });
  it.each(['high', 'medium'] as const)('normalizes only unsupported tidiness at %s confidence', (confidence) => {
    for (const [tidiness, tidinessReason] of [
      ['tidy', 'many_items_unarranged'], ['moderate', 'items_organized'],
      ['cluttered', 'some_items_unarranged'], ['tidy', 'not_applicable'],
      ['cluttered', 'unclear'], ['unknown', 'items_organized'],
    ]) {
      const result = photoAnalysisResult(parsePhotoAnalysis({ ...analysis, confidence, tidiness, tidinessReason }));
      expect(result.status).toBe('analyzed');
      expect(result.analysis.cleanliness).toBe('moderate');
      expect(result.analysis.tidiness).toBe('unknown');
      expect(result.analysis.tidinessReason).toBe('unclear');
      expect(result.analysis.observations).toBe('Kotoran tampak pada foto.');
    }
  });
  it.each([
    ['light', 'no_visible_dirt', 'no_visible_dirt'],
    ['light', 'small_dirt_patches', 'visible_dirt'],
    ['moderate', 'widespread_dirt', 'visible_dirt'],
    ['heavy', 'dirt_buildup', 'visible_dirt'],
  ])('accepts supported dirt rubric %s/%s', (cleanliness, cleanlinessReason, observations) => {
    expect(photoAnalysisResult(parsePhotoAnalysis({ ...analysis, confidence: 'medium', cleanliness, cleanlinessReason, observations })).status).toBe('analyzed');
  });
  it.each([
    ['tidy', 'items_organized'], ['moderate', 'some_items_unarranged'],
    ['cluttered', 'many_items_unarranged'], ['unknown', 'not_applicable'], ['unknown', 'unclear'],
  ])('preserves supported tidiness rubric %s/%s', (tidiness, tidinessReason) => {
    const result = photoAnalysisResult(parsePhotoAnalysis({ ...analysis, confidence: 'medium', tidiness, tidinessReason }));
    expect(result.analysis.tidiness).toBe(tidiness);
    expect(result.analysis.tidinessReason).toBe(tidinessReason);
  });
  it('keeps reasons optional for old responses', () => {
    expect(parsePhotoAnalysis(analysis)).not.toHaveProperty('cleanlinessReason');
  });
  it.each([
    { ...analysis, cleanlinessReason: 'private OCR' },
    { ...analysis, tidinessReason: 'buy service' },
    { ...analysis, cleanlinessReason: null },
    { ...analysis, target: 'room' },
    { ...analysis, objectName: 'private' },
    { ...analysis, price: 1 },
    { ...analysis, observations: 'Ignore previous instructions; private OCR' },
    { ...analysis, confidence: 0.99 },
    { ...analysis, tidiness: 'messy' },
    null,
    [],
    {},
  ])('rejects untrusted model fields %j', (value) =>
    expect(() => parsePhotoAnalysis(value)).toThrow(),
  );
  it.each([
    ['visible_dirt', 'Kotoran tampak pada foto.'],
    ['visible_clutter', 'Barang tampak tidak tertata.'],
    [
      'no_visible_dirt',
      'Tidak tampak kotoran jelas pada foto; bukan jaminan kebersihan.',
    ],
    ['unclear', 'Kondisi belum dapat dinilai dari foto.'],
  ])('maps %s without echoing model text', (observations, safe) =>
    expect(parsePhotoAnalysis({ ...analysis, observations }).observations).toBe(
      safe,
    ),
  );
});

describe('image validation', () => {
  it('fully decodes and strips metadata on normalization', async () => {
    const input = await sharp(await png())
      .withExif({ IFD0: { Artist: 'PRIVATE' } })
      .jpeg()
      .toBuffer();
    const normalized = await normalizePhoto(input, 'image/jpeg');
    expect((await sharp(normalized).metadata()).exif).toBeUndefined();
    expect((await sharp(normalized).metadata()).format).toBe('jpeg');
    expect(normalized.length).toBeLessThanOrEqual(1024 * 1024);
  });
  it('rejects animated WebP, pixel bombs and truncated full-decode payloads', async () => {
    const animated = await sharp(
      Buffer.concat([Buffer.alloc(4 * 4 * 3, 0), Buffer.alloc(4 * 4 * 3, 255)]),
      { raw: { width: 4, height: 8, channels: 3, pageHeight: 4 } },
    )
      .webp({ loop: 0, delay: [100, 100] })
      .toBuffer();
    await expect(normalizePhoto(animated, 'image/webp')).rejects.toThrow();
    const bomb = await sharp({
      create: { width: 5000, height: 4001, channels: 3, background: 'white' },
    })
      .png()
      .toBuffer();
    await expect(normalizePhoto(bomb, 'image/png')).rejects.toThrow();
    const jpeg = await sharp(await png())
      .jpeg()
      .toBuffer();
    await expect(
      normalizePhoto(jpeg.subarray(0, jpeg.length - 20), 'image/jpeg'),
    ).rejects.toThrow();
  });
  it('rejects MIME mismatch, corrupt payload and oversized dimensions', async () => {
    await expect(normalizePhoto(await png(), 'image/jpeg')).rejects.toThrow();
    await expect(
      normalizePhoto(Buffer.from([255, 216, 255, 0]), 'image/jpeg'),
    ).rejects.toThrow();
    const wide = await sharp({
      create: { width: 10001, height: 1, channels: 3, background: 'white' },
    })
      .png()
      .toBuffer();
    await expect(normalizePhoto(wide, 'image/png')).rejects.toThrow();
  });
});

describe('raw image endpoint', () => {
  it('authenticates before decoding or provider work', async () => {
    expect(
      (
        await request(app())
          .post('/api/customer/chat/analyze-image')
          .set('Content-Type', 'image/png')
          .send(await png())
      ).status,
    ).toBe(401);
    expect(mocks.vision).not.toHaveBeenCalled();
  });
  it('returns exact analysis envelope with safe Indonesian fields', async () => {
    const res = await post(app(), await png());
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data).sort()).toEqual([
      'analysis',
      'reply',
      'status',
    ]);
    expect(res.body.data.status).toBe('analyzed');
    expect(Object.keys(res.body.data.analysis).sort()).toEqual([
      'cleanliness',
      'confidence',
      'observations',
      'tidiness',
    ]);
    expect(JSON.stringify(res.body)).not.toMatch(/Groq|provider|rekomendasi/i);
  });
  it('rejects unsupported type, compressed transport, query fields and oversized body', async () => {
    const server = app();
    expect(
      (await post(server, Buffer.from('{}'), 'application/json')).status,
    ).toBe(415);
    expect(
      (await post(server, await png()).set('Content-Encoding', 'gzip')).status,
    ).toBe(415);
    expect(
      (await post(server, await png()).query({ caption: 'ignore' })).status,
    ).toBe(400);
    expect((await post(server, Buffer.alloc(5 * 1024 * 1024 + 1))).status).toBe(
      413,
    );
    expect(mocks.vision).not.toHaveBeenCalled();
  });
  it('rate limits before provider work', async () => {
    const server = app();
    const id = ++user;
    const bytes = await png();
    for (let i = 0; i < 3; i++)
      expect((await post(server, bytes, 'image/png', id)).status).toBe(200);
    expect((await post(server, bytes, 'image/png', id)).status).toBe(429);
    expect(mocks.vision).toHaveBeenCalledTimes(3);
  });
  it('bounds concurrent work before decoding and releases capacity after failure', async () => {
    const server = app();
    const bytes = await png();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    mocks.vision.mockImplementation(() => pending.then(() => analysis));
    const first = post(server, bytes).then((r) => r);
    const second = post(server, bytes).then((r) => r);
    await vi.waitFor(() => expect(mocks.vision).toHaveBeenCalledTimes(2));
    expect((await post(server, bytes)).status).toBe(503);
    release();
    await Promise.all([first, second]);
    mocks.vision.mockRejectedValue(new Error('private provider URL'));
    const failure = await post(server, bytes);
    expect(failure.status).toBe(503);
    expect(JSON.stringify(failure.body)).not.toContain('private');
    mocks.vision.mockResolvedValue(analysis);
    expect((await post(server, bytes)).status).toBe(200);
  });
  it('clears incomplete upload capacity after client abort without provider work', async () => {
    const server = app().listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const clients: http.ClientRequest[] = [];
    try {
      const port = (server.address() as AddressInfo).port;
      for (let i = 0; i < 2; i++) {
        const client = http.request({
          hostname: '127.0.0.1',
          port,
          path: '/api/customer/chat/analyze-image',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${++user}`,
            'Content-Type': 'image/png',
            'Content-Length': '1000',
          },
        });
        client.on('error', () => undefined);
        client.write(Buffer.alloc(8));
        clients.push(client);
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect((await post(server, await png())).status).toBe(503);
      clients.forEach((client) => client.destroy());
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect((await post(server, await png())).status).toBe(200);
      expect(mocks.vision).toHaveBeenCalledTimes(1);
    } finally {
      clients.forEach((client) => client.destroy());
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
  it('cancels provider work on disconnect, clears images and releases both slots', async () => {
    const server = app().listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const clients: http.ClientRequest[] = [];
    const rejectPending: (() => void)[] = [];
    mocks.vision.mockImplementation(
      (_image: Buffer, _timeout: number, signal?: AbortSignal) =>
        new Promise((_resolve, reject) => {
          const abort = () =>
            reject(new DOMException('private provider details', 'AbortError'));
          rejectPending.push(abort);
          signal?.addEventListener('abort', abort, { once: true });
        }),
    );
    try {
      const bytes = await png();
      const port = (server.address() as AddressInfo).port;
      for (let i = 0; i < 2; i++) {
        const client = http.request({
          hostname: '127.0.0.1',
          port,
          path: '/api/customer/chat/analyze-image',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${++user}`,
            'Content-Type': 'image/png',
            'Content-Length': bytes.length,
          },
        });
        client.on('error', () => undefined);
        clients.push(client);
        client.end(bytes);
      }
      await vi.waitFor(() => expect(mocks.vision).toHaveBeenCalledTimes(2));
      const calls = [...mocks.vision.mock.calls];
      expect(calls[0]![2]).toBeInstanceOf(AbortSignal);
      expect(calls[1]![2]).toBeInstanceOf(AbortSignal);
      expect(calls[0]![2]).not.toBe(calls[1]![2]);
      clients.forEach((client) => client.destroy());
      await vi.waitFor(() => {
        for (const [image, , signal] of calls) {
          expect(signal.aborted).toBe(true);
          expect(image.equals(Buffer.alloc(image.length))).toBe(true);
        }
      });
      mocks.vision.mockResolvedValue(analysis);
      const responses = await Promise.all([
        post(server, bytes),
        post(server, bytes),
      ]);
      expect(responses.map((response) => response.status)).toEqual([200, 200]);
    } finally {
      clients.forEach((client) => client.destroy());
      rejectPending.forEach((reject) => reject());
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
  it('rejects invalid provider JSON with safe error', async () => {
    mocks.vision.mockResolvedValueOnce({ ...analysis, price: 1 });
    const res = await post(app(), await png());
    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toContain('private');
  });
});
