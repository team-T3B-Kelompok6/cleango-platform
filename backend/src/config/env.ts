import 'dotenv/config';

export interface AppEnv {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  FRONTEND_ORIGIN: string;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID?: string | undefined;
  GOOGLE_ANDROID_CLIENT_ID?: string | undefined;
  OSRM_BASE_URL: string;
  GROQ_API_KEY: string;
  GROQ_MODEL: string;
  GROQ_FALLBACK_MODELS: string[];
  CHATBOT_DATABASE_ENABLED: boolean;
  CHATBOT_VISION_ENABLED: boolean;
  CHATBOT_VISION_MODEL: string;
  MIDTRANS_SERVER_KEY: string;
  MIDTRANS_CLIENT_KEY: string;
  MIDTRANS_IS_PRODUCTION: boolean;
  MIDTRANS_NOTIFICATION_URL?: string | undefined;
}

let cachedEnv: AppEnv | undefined;

function httpsReturnUrl(name: string): string | undefined {
  const value = process.env[name]?.trim();
  if (!value) return undefined;
  // Ignore unfilled placeholders such as https://<HOST_BACKEND_PUBLIK>/...
  if (value.includes('<') || value.includes('>')) return undefined;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} harus berupa URL HTTPS yang valid`);
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error(`${name} harus memakai HTTPS`);
  }
  return url.toString();
}

export function getEnv(): AppEnv {
  if (cachedEnv) return cachedEnv;
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV tidak valid');
  }
  const port = Number(process.env.PORT ?? 3001);
  const dbPort = Number(process.env.DB_PORT ?? 3306);
  if (!Number.isInteger(port) || port <= 0 || port > 65535)
    throw new Error('PORT tidak valid');
  if (!Number.isInteger(dbPort) || dbPort <= 0 || dbPort > 65535)
    throw new Error('DB_PORT tidak valid');
  const jwtSecret =
    process.env.JWT_SECRET ??
    (nodeEnv === 'production' ? '' : 'cleango-development-only');
  if (!jwtSecret) throw new Error('JWT_SECRET wajib diisi pada production');
  const chatDatabase = process.env.CHATBOT_DATABASE_ENABLED ?? 'false';
  if (!['true', 'false'].includes(chatDatabase))
    throw new Error('CHATBOT_DATABASE_ENABLED harus true atau false');

  const midtransProduction = process.env.MIDTRANS_IS_PRODUCTION ?? 'false';
  if (!['true', 'false'].includes(midtransProduction)) {
    throw new Error('MIDTRANS_IS_PRODUCTION harus true atau false');
  }

  cachedEnv = {
    NODE_ENV: nodeEnv as AppEnv['NODE_ENV'],
    PORT: port,
    DB_HOST: process.env.DB_HOST ?? '127.0.0.1',
    DB_PORT: dbPort,
    DB_USER: process.env.DB_USER ?? 'root',
    DB_PASSWORD: process.env.DB_PASSWORD ?? '',
    DB_NAME: process.env.DB_NAME ?? 'cleango',
    FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
    JWT_SECRET: jwtSecret,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_ANDROID_CLIENT_ID: process.env.GOOGLE_ANDROID_CLIENT_ID,
    OSRM_BASE_URL:
      process.env.OSRM_BASE_URL ?? 'https://router.project-osrm.org',
    GROQ_API_KEY: process.env.GROQ_API_KEY?.trim() ?? '',
    CHATBOT_DATABASE_ENABLED: chatDatabase === 'true',
    CHATBOT_VISION_ENABLED: process.env.CHATBOT_VISION_ENABLED === 'true',
    CHATBOT_VISION_MODEL: process.env.CHATBOT_VISION_MODEL?.trim() || 'qwen/qwen3.8-27b',
    MIDTRANS_SERVER_KEY: process.env.MIDTRANS_SERVER_KEY?.trim() ?? '',
    MIDTRANS_CLIENT_KEY: process.env.MIDTRANS_CLIENT_KEY?.trim() ?? '',
    MIDTRANS_IS_PRODUCTION: midtransProduction === 'true',
    MIDTRANS_NOTIFICATION_URL: httpsReturnUrl('MIDTRANS_NOTIFICATION_URL'),
    GROQ_MODEL: process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-20b',
    GROQ_FALLBACK_MODELS: (
      process.env.GROQ_FALLBACK_MODELS ?? 'openai/gpt-oss-120b,qwen/qwen3.8-27b'
    )
      .split(',')
      .map((model) => model.trim())
      .filter(Boolean),
  };
  return cachedEnv!;
}
