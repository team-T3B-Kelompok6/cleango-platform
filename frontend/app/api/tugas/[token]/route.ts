import { revalidatePath } from 'next/cache';
import {
  cleanerEvent,
  cleanerUpload,
  getCleanerTask,
  rateLimit,
} from '@/lib/cleaner/service';
import { TaskError } from '@/lib/cleaner/errors';
import { boundedBody, checkOrigin } from '@/lib/cleaner/http';
const headers = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};
type Context = { params: Promise<{ token: string }> };
function failure(error: unknown) {
  if (error instanceof TaskError)
    return Response.json(
      { message: error.message },
      { status: error.status, headers },
    );
  if (error instanceof SyntaxError || error instanceof TypeError)
    return Response.json(
      { message: 'Permintaan tidak valid.' },
      { status: 400, headers },
    );
  console.error(
    'Cleaner request failed:',
    error instanceof Error ? error.name : 'unknown',
  );
  return Response.json(
    {
      message:
        'Data belum dapat diperbarui. Coba lagi; perubahan yang sudah tersimpan tetap ada.',
    },
    { status: 503, headers },
  );
}
export async function GET(_req: Request, { params }: Context) {
  try {
    const { token } = await params;
    rateLimit(token);
    return Response.json({ data: await getCleanerTask(token) }, { headers });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(req: Request, { params }: Context) {
  try {
    const { token } = await params;
    rateLimit(token);
    checkOrigin(req);
    const multipart = req.headers
      .get('content-type')
      ?.includes('multipart/form-data');
    const body = await boundedBody(req, multipart ? 2200000 : 12000);
    let data;
    if (multipart) {
      const form = await new Response(body, {
        headers: { 'Content-Type': req.headers.get('content-type')! },
      }).formData();
      const file = form.get('file');
      if (!(file instanceof File))
        throw new TaskError('Pilih foto bukti kerja.');
      data = await cleanerUpload(token, file);
    } else {
      const input = JSON.parse(new TextDecoder().decode(body));
      if (!input || typeof input !== 'object' || Array.isArray(input))
        throw new TaskError('Permintaan tidak valid.');
      data = await cleanerEvent(token, input);
    }
    for (const route of ['/', '/pesanan', '/petugas', '/jadwal', '/laporan'])
      revalidatePath(route);
    revalidatePath('/pesanan/' + encodeURIComponent(data.orderId));
    return Response.json({ data }, { headers });
  } catch (error) {
    return failure(error);
  }
}
