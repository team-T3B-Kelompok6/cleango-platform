import { cookies } from 'next/headers';
import { adminDemoMedia } from '@/lib/demo/admin-api';
import { TaskError } from '@/lib/cleaner/errors';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { bytes, type } = await adminDemoMedia(
      (await params).id,
      (await cookies()).get('cleango-session')?.value ?? '',
    );
    return new Response(bytes, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof TaskError)
      return Response.json(
        { message: error.message },
        { status: error.status },
      );
    throw error;
  }
}
