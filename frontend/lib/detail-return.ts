import { resources } from './resources';
import type { Resource, Search } from '@/types';
export const detailFilterKeys = ['q', 'tab', 'from', 'to', 'page'] as const;
export function detailReturn(resource: Resource, search: Search) {
  const base = resources[resource].path;
  const result: { href: string; search: Search } = { href: base, search: {} };
  const raw = search.returnTo;
  if (typeof raw !== 'string' || raw.length > 3000) return result;
  try {
    const url = new URL(raw, 'https://cleango.invalid');
    if (url.origin !== 'https://cleango.invalid' || url.pathname !== base)
      return result;
    const params = new URLSearchParams();
    for (const key of detailFilterKeys) {
      const value = url.searchParams.get(key);
      if (value && value.length <= 1000) {
        params.set(key, value);
        result.search[key] = value;
      }
    }
    if (params.size) result.href += '?' + params.toString();
  } catch {
    /* Invalid return paths fall back to the resource list. */
  }
  return result;
}
