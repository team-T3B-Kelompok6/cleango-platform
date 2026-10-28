/** Upload paths belong to Express; demo/public assets belong to Next.js. */
export function serviceMediaUrl(value: string, mediaOrigin: string): string {
  if (value.startsWith('/uploads/') && mediaOrigin)
    return new URL(value, mediaOrigin).href;
  return value;
}
