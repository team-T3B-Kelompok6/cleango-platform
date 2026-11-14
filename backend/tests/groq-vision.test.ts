import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/config/env.js', () => ({
  getEnv: () => ({
    GROQ_API_KEY: 'synthetic-key',
    CHATBOT_VISION_MODEL: 'qwen/qwen3.8-27b',
  }),
}));
import { analyzeWithGroq } from '../src/lib/groq-vision.js';
afterEach(() => vi.unstubAllGlobals());
const completion = (content: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }));
describe('Groq vision transport', () => {
  it('sends one normalized inline image, JSON mode, no history/catalog or fallback', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(completion('{"cleanliness":"moderate"}'));
    vi.stubGlobal('fetch', fetcher);
    expect(await analyzeWithGroq(Buffer.from('synthetic'))).toEqual({
      cleanliness: 'moderate',
    });
    const options = fetcher.mock.calls[0]![1];
    const body = JSON.parse(options.body);
    expect(body.model).toBe('qwen/qwen3.8-27b');
    expect(body.response_format).toEqual({ type: 'json_object' });
    const prompt = body.messages[1].content[0].text;
    expect(prompt).not.toMatch(/"target"|"objectName"|"recommendations"/);
    expect(prompt).toContain('"cluttered"');
    expect(prompt).toContain('"visible_dirt"');
    expect(prompt).toContain('light =');
    expect(prompt).toContain('moderate =');
    expect(prompt).toContain('heavy =');
    expect(prompt).toContain('Clutter is not dirt');
    expect(prompt).toContain('medium');
    expect(prompt).toContain('cleanlinessReason');
    expect(prompt).toContain('not_applicable');
    expect(body.messages[1].content[1].image_url.url).toBe(
      'data:image/jpeg;base64,c3ludGhldGlj',
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(options.redirect).toBe('error');
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
  it.each(['client', 'timeout'] as const)(
    'propagates %s cancellation to fetch without exposing abort details',
    async (source) => {
      const controller = new AbortController();
      let signal!: AbortSignal;
      vi.stubGlobal(
        'fetch',
        vi.fn((_url: string, options: RequestInit) => {
          signal = options.signal as AbortSignal;
          return new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(signal.reason), {
              once: true,
            });
          });
        }),
      );
      const pending = analyzeWithGroq(
        Buffer.from('synthetic'),
        source === 'timeout' ? 10 : 30_000,
        controller.signal,
      );
      const checked = expect(pending).rejects.toMatchObject({
        statusCode: 504,
        code: 'VISION_TIMEOUT',
        message: 'Analisis foto melewati batas waktu. Coba lagi.',
      });
      expect(signal).not.toBe(controller.signal);
      expect(signal.aborted).toBe(false);
      if (source === 'client')
        controller.abort(
          new DOMException('private disconnect details', 'AbortError'),
        );
      await checked;
      expect(signal.aborted).toBe(true);
      expect(controller.signal.aborted).toBe(source === 'client');
    },
  );
  it.each([
    new Response('private', { status: 500 }),
    completion('not json'),
    completion('null'),
    new Response('x'.repeat(20000)),
  ])('safely rejects invalid provider body', async (response) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    await expect(
      analyzeWithGroq(Buffer.from('synthetic')),
    ).rejects.toMatchObject({ statusCode: 503, code: 'VISION_UNAVAILABLE' });
  });
  it('returns 504 on provider timeout without logging private errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('private', 'TimeoutError')),
    );
    await expect(
      analyzeWithGroq(Buffer.from('synthetic')),
    ).rejects.toMatchObject({ statusCode: 504, code: 'VISION_TIMEOUT' });
  });
});
