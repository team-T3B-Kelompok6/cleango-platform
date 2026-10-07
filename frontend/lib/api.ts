import 'server-only';

const apiUrl = process.env.API_URL ?? 'http://localhost:3001/api';

export function getApiUrl(path: string) {
  return `${apiUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

