import { cleanerPhoto } from '@/lib/cleaner/service';
import { TaskError } from '@/lib/cleaner/errors';
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string; id: string }> },
) {
  try {
    const { token, id } = await params;
    const { bytes, type } = await cleanerPhoto(token, id);
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      },
    });
  } catch (error) {
    return Response.json(
      { message: 'Foto tidak tersedia.' },
      {
        status: error instanceof TaskError ? error.status : 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
