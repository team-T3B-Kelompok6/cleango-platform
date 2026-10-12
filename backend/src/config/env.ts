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
}

let cachedEnv: AppEnv | undefined;

export function getEnv(): AppEnv {
  if (cachedEnv) return cachedEnv;
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV tidak valid');
  }
  const port = Number(process.env.PORT ?? 3001);
  const dbPort = Number(process.env.DB_PORT ?? 3306);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new Error('PORT tidak valid');
  if (!Number.isInteger(dbPort) || dbPort <= 0 || dbPort > 65535) throw new Error('DB_PORT tidak valid');
  const jwtSecret = process.env.JWT_SECRET ?? (nodeEnv === 'production' ? '' : 'cleango-development-only');
  if (!jwtSecret) throw new Error('JWT_SECRET wajib diisi pada production');

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
  };
  return cachedEnv;
}
