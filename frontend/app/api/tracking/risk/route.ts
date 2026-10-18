import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const base = process.env.API_URL;
  const token = (await cookies()).get('cleango-session')?.value;
  if (!base)
    return NextResponse.json(
      { message: 'API belum dikonfigurasi.' },
      { status: 503 },
    );
  if (!token)
    return NextResponse.json(
      { message: 'Sesi admin tidak tersedia.' },
      { status: 401 },
    );
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/tracking/risk`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(await request.json()),
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    });
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: 'Risiko keterlambatan belum dapat diperbarui.' },
      { status: 503 },
    );
  }
}
