import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import sharp from 'sharp';
const state = vi.hoisted(() => ({
  enabled: true,
  vision: vi.fn(),
}));
vi.mock('../src/config/env.js', async (original) => {
  const actual = await original<typeof import('../src/config/env.js')>();
  return {
    getEnv: () => ({
      ...actual.getEnv(),
      CHATBOT_VISION_ENABLED: state.enabled,
    }),
  };
});
vi.mock('../src/model/user.model.js', async (original) => ({
  ...(await original<typeof import('../src/model/user.model.js')>()),
  isTokenRevoked: vi.fn().mockResolvedValue(false),
}));
vi.mock('../src/lib/groq-vision.js', () => ({ analyzeWithGroq: state.vision }));
const catalogQuery = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('Photo analysis must not query catalog');
  }),
);
vi.mock('../src/lib/db.js', () => ({
  pool: { query: catalogQuery, execute: catalogQuery },
}));
import { createApp } from '../src/app.js';
import { createAccessToken } from '../src/lib/jwt.js';
const app = createApp();
const token = (id: number, role = 'customer') =>
  createAccessToken({ id, email: 'test@example.test', role } as never);
const post = (body: Buffer, id = 4321, role = 'customer', mime = 'image/png') =>
  request(app)
    .post('/api/customer/chat/analyze-image')
    .set('Authorization', `Bearer ${token(id, role)}`)
    .set('Content-Type', mime)
    .send(body);

describe('actual photo app mount', () => {
  it('requires real customer bearer and returns exact envelope at analyze-image', async () => {
    const image = await sharp({
      create: { width: 10, height: 10, channels: 3, background: 'white' },
    })
      .png()
      .toBuffer();
    expect(
      (
        await request(app)
          .post('/api/customer/chat/analyze-image')
          .set('Content-Type', 'image/png')
          .send(image)
      ).status,
    ).toBe(401);
    expect((await post(image, 1, 'admin')).status).toBe(403);
    state.vision.mockResolvedValue({
      cleanliness: 'moderate',
      tidiness: 'unknown',
      observations: 'visible_dirt',
      confidence: 'high',
    });
    const res = await post(image);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(Object.keys(res.body.data).sort()).toEqual([
      'analysis',
      'reply',
      'status',
    ]);
    expect(typeof res.body.data.analysis.observations).toBe('string');
    expect(res.body.data.status).toBe('analyzed');
    expect(res.body.data.analysis).toEqual({
      cleanliness: 'moderate',
      tidiness: 'unknown',
      observations: 'Kotoran tampak pada foto.',
      confidence: 'high',
    });
    expect(catalogQuery).not.toHaveBeenCalled();
    expect(JSON.stringify(res.body)).not.toMatch(/Groq|provider|rekomendasi/i);
  });
  it('disabled flag returns 503 before raw or JSON parsers and provider', async () => {
    state.enabled = false;
    state.vision.mockClear();
    const res = await post(
      Buffer.from('invalid JSON'),
      2,
      'customer',
      'application/json',
    );
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('VISION_DISABLED');
    expect(state.vision).not.toHaveBeenCalled();
    state.enabled = true;
  });
});
