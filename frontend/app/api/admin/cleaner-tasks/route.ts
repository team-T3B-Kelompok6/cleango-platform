import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { request, ApiError } from '@/lib/api';
import { adminTaskBoard, resendAdmin } from '@/lib/cleaner/service';
import { seedDemo } from '@/lib/cleaner/demo-store';
import { TaskError } from '@/lib/cleaner/errors';
import { boundedBody, checkOrigin, requestOrigin } from '@/lib/cleaner/http';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(req: Request) {
  if (!(await cookies()).has('cleango-session'))
    return Response.json(
      { message: 'Masuk kembali sebagai admin.' },
      { status: 401, headers },
    );
  try {
    await request('/staff', {}, true);
    return Response.json(
      { data: await adminTaskBoard(requestOrigin(req)) },
      { headers },
    );
  } catch (error) {
    if (error instanceof ApiError || error instanceof TaskError)
      return Response.json(
        { message: error.message },
        { status: error.status, headers },
      );
    throw error;
  }
}
export async function POST(req: Request) {
  if (!(await cookies()).has('cleango-session'))
    return Response.json(
      { message: 'Masuk kembali sebagai admin.' },
      { status: 401, headers },
    );
  try {
    checkOrigin(req);
    await request('/staff', {}, true);
    const bytes = await boundedBody(req, 8000);
    const body = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new TaskError('Permintaan tidak valid.');
    if (body.intent === 'seed' || body.intent === 'reset') {
      const result = await seedDemo(body.intent === 'reset');
      revalidatePath('/');
      revalidatePath('/pesanan');
      revalidatePath('/petugas');
      return Response.json({ data: result }, { headers });
    }
    if (
      body.intent !== 'resend' ||
      typeof body.orderId !== 'string' ||
      typeof body.staffName !== 'string'
    )
      throw new TaskError('Permintaan tidak valid.');
    await resendAdmin(body.orderId, body.staffName);
    return Response.json(
      { data: await adminTaskBoard(requestOrigin(req)) },
      { headers },
    );
  } catch (error) {
    if (error instanceof ApiError || error instanceof TaskError)
      return Response.json(
        { message: error.message },
        { status: error.status, headers },
      );
    if (error instanceof SyntaxError)
      return Response.json(
        { message: 'Permintaan tidak valid.' },
        { status: 400, headers },
      );
    throw error;
  }
}
