import { TaskError } from './errors';
export function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get('host');
  try {
    return new URL(url.protocol + '//' + (host || url.host)).origin;
  } catch {
    return url.origin;
  }
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  if (origin !== requestOrigin(request))
    throw new TaskError('Asal permintaan tidak valid.', 403);
}
export async function boundedBody(request: Request, limit: number) {
  if (Number(request.headers.get('content-length') ?? 0) > limit)
    throw new TaskError('Permintaan terlalu besar.', 413);
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new TaskError('Permintaan terlalu besar.', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return body;
}
