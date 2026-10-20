import { afterEach, expect, it, vi } from 'vitest';
vi.mock('dotenv/config', () => ({}));
afterEach(() => vi.unstubAllEnvs());
it.each([
  [undefined, false],
  ['false', false],
  ['true', true],
] as const)('chat database access is opt-in: %s', async (value, expected) => {
  vi.resetModules();
  vi.stubEnv('CHATBOT_DATABASE_ENABLED', value);
  const { getEnv } = await import('../src/config/env.js');
  expect(getEnv().CHATBOT_DATABASE_ENABLED).toBe(expected);
});
it('rejects ambiguous chatbot database flags', async () => {
  vi.resetModules();
  vi.stubEnv('CHATBOT_DATABASE_ENABLED', 'yes');
  const { getEnv } = await import('../src/config/env.js');
  expect(() => getEnv()).toThrow('CHATBOT_DATABASE_ENABLED');
});
