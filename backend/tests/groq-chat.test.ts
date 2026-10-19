import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/config/env.js', () => ({
  getEnv: () => ({
    GROQ_API_KEY: 'test-secret',
    GROQ_MODEL: 'openai/gpt-oss-20b',
    GROQ_FALLBACK_MODELS: ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b'],
  }),
}));
import { askGroq, minimizeChatText } from '../src/lib/groq-chat.js';
const sources = [
  { id: 'faq:1', title: 'Harga', text: 'Deep Cleaning mulai Rp150.000.' },
];
const valid = () =>
  new Response(
    JSON.stringify({
      choices: [
        {
          finish_reason: 'stop',
          message: {
            content: JSON.stringify({
              answer: 'Harga Deep Cleaning mulai Rp150.000.',
              sourceIds: ['faq:1'],
            }),
          },
        },
      ],
      usage: { prompt_tokens: 60, completion_tokens: 20 },
    }),
  );
const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());
describe('Groq bounded fallback and validation', () => {
  it('tries all three models in order on rate limit and timeout', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(valid());
    const result = await askGroq('harga?', [], sources);
    expect(result).toMatchObject({
      model: 'qwen/qwen3.8-27b',
      attempts: 3,
      promptTokens: 60,
      completionTokens: 20,
    });
    expect(
      fetchMock.mock.calls.map((call) => JSON.parse(call[1].body).model),
    ).toEqual([
      'openai/gpt-oss-20b',
      'openai/gpt-oss-120b',
      'qwen/qwen3.8-27b',
    ]);
  });
  it('falls back on invalid output or an invented price', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                finish_reason: 'stop',
                message: {
                  content: JSON.stringify({
                    answer: 'Rp999.000',
                    sourceIds: ['faq:1'],
                  }),
                },
              },
            ],
          }),
        ),
      )
      .mockResolvedValueOnce(valid());
    expect((await askGroq('harga?', [], sources))?.model).toBe(
      'openai/gpt-oss-120b',
    );
  });
  it('stops on invalid credentials rather than retrying the same key', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 401 }));
    expect(await askGroq('harga?', [], sources)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('bounds failures to three attempts and returns FAQ fallback control', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    expect(await askGroq('harga?', [], sources)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it('does not forward known secrets, addresses, emails, or phone numbers', async () => {
    fetchMock.mockResolvedValue(valid());
    await askGroq(
      'harga? user@example.test 081234567890 gsk_abcdef Jl. Mawar No 1',
      [],
      sources,
    );
    const body = fetchMock.mock.calls[0]?.[1].body;
    expect(body).not.toContain('user@example.test');
    expect(body).not.toContain('081234567890');
    expect(body).not.toContain('gsk_abcdef');
    expect(body).not.toContain('Mawar');
    expect(minimizeChatText('Bearer abc.def.ghi')).toBe('[token]');
  });
  it('requires source IDs from the retrieved context', async () => {
    fetchMock.mockImplementation(
      () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                finish_reason: 'stop',
                message: {
                  content: JSON.stringify({
                    answer: 'Harga Rp150.000',
                    sourceIds: ['forged'],
                  }),
                },
              },
            ],
          }),
        ),
    );
    expect(await askGroq('harga?', [], sources)).toBeNull();
  });
  it.each([
    'Saya bisa memesan layanan untuk Anda.',
    'Saya dapat membantu Anda membatalkan pesanan.',
    'Saya akan menghubungi admin.',
    'Sebagai asisten bTaskee, saya membantu Anda.',
    'Berikan password Anda untuk booking.',
    'Berikan alamat lengkap untuk saya proses.',
    'Hubungi admin melalui admin@cleango.example.',
  ])(
    'rejects unsupported capability or secret requests: %s',
    async (answer) => {
      fetchMock.mockImplementation(
        () =>
          new Response(
            JSON.stringify({
              choices: [
                {
                  finish_reason: 'stop',
                  message: {
                    content: JSON.stringify({ answer, sourceIds: ['faq:1'] }),
                  },
                },
              ],
            }),
          ),
      );
      expect(
        await askGroq('Apa yang bisa dilakukan Boo?', [], sources),
      ).toBeNull();
    },
  );
  it('does not mistake an unrelated source number for a supported price', async () => {
    fetchMock.mockImplementation(
      () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                finish_reason: 'stop',
                message: {
                  content: JSON.stringify({
                    answer: 'Harga Rp6.',
                    sourceIds: ['knowledge:team'],
                  }),
                },
              },
            ],
          }),
        ),
    );
    expect(
      await askGroq(
        'berapa harganya?',
        [],
        [{ id: 'knowledge:team', title: 'Tim', text: 'Proyek Kelompok 6.' }],
      ),
    ).toBeNull();
  });
  it('minimizes sensitive historical tokens and disables credential redirects', async () => {
    fetchMock.mockResolvedValue(valid());
    await askGroq(
      'harga?',
      [
        'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MX0.signature password saya: sensitive-value NIK 1234567890123456',
      ],
      sources,
    );
    const options = fetchMock.mock.calls[0]?.[1];
    expect(options.redirect).toBe('error');
    expect(options.body).not.toContain('sensitive-value');
    expect(options.body).not.toContain('eyJhbGci');
    expect(options.body).not.toContain('1234567890123456');
  });
});
