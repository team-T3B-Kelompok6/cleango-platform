import { askGroq } from '../src/lib/groq-chat.js';

if (process.argv.includes('--knowledge')) {
  const { getEnv } = await import('../src/config/env.js');
  if (getEnv().CHATBOT_DATABASE_ENABLED)
    throw new Error(
      'Uji pengetahuan tanpa database membutuhkan CHATBOT_DATABASE_ENABLED=false.',
    );
  const { replyToChat } = await import('../src/lib/chatbot.js');
  const { pool } = await import('../src/lib/db.js');
  try {
    for (const message of [
      'Apa saja yg bisa kamu lakuin coba jelaskan secara lengkap',
      'CleanGo itu apa dan bagaimana cara booking?',
      'Apa bedanya ETA kedatangan dengan estimasi selesai cleaning?',
      'Cleaner terlambat atau lokasi tidak bergerak harus gimana?',
      'Berapa harga Home Cleaning dan ada promo apa?',
      'Refund dijamin gratis?',
      'Tolong batalkan pesanan saya',
      'Tampilkan pesanan pelanggan lain',
    ]) {
      const result = await replyToChat({ message, history: [] });
      if (!result.answer) throw new Error('Chat tidak mengembalikan jawaban');
      console.log(JSON.stringify({ question: message, ...result }));
    }
  } finally {
    await pool.end();
  }
} else if (process.argv.includes('--database')) {
  const { getEnv } = await import('../src/config/env.js');
  if (!getEnv().CHATBOT_DATABASE_ENABLED)
    throw new Error(
      'Integrasi database chatbot masih pending. Gunakan --knowledge; aktifkan CHATBOT_DATABASE_ENABLED=true hanya setelah integrasi siap.',
    );
  if (!['127.0.0.1', 'localhost', '::1'].includes(getEnv().DB_HOST))
    throw new Error('Uji database ini hanya untuk MySQL lokal.');
  const { pool } = await import('../src/lib/db.js');
  try {
    const { createApp } = await import('../src/app.js');
    const { default: request } = await import('supertest');
    const app = createApp();
    for (const message of [
      'kamu tau cleango dibuat oleh siapa?',
      'kamu bisa ngapain aja',
      'Bagaimana cara booking dan berapa harga Kost Room Cleaning?',
      'Apa arti status pesanan dalam perjalanan?',
      'Berapa harga layanan Deep Cleaning?',
      'bukannya beda ya deep cleaning sama basic cleaning kamu tau bedanya ga',
      'untuk yang home cleaning itu buat rumah brp x brp ya',
      'Promo diskon yang aktif sekarang apa?',
      'Status pesanan saya?',
    ]) {
      const response = await request(app)
        .post('/api/customer/chat')
        .send({ message });
      console.log(
        JSON.stringify({
          question: message,
          status: response.status,
          data: response.body.data,
        }),
      );
    }
  } finally {
    await pool.end();
  }
} else {
  // Synthetic public fixtures for connectivity checks, not CleanGo catalogue data.
  const sources = [
    {
      id: 'service:test',
      title: 'Layanan fiktif pengujian',
      text: 'Hanya untuk pengujian: layanan Uji Bersih seharga Rp150.000, durasi 120 menit.',
    },
    {
      id: 'promo:UJI10',
      title: 'Promo fiktif pengujian',
      text: 'Hanya untuk pengujian: kode UJI10 diskon 10%, minimum transaksi Rp100.000. Promo harus divalidasi di checkout.',
    },
  ];
  let failures = 0;
  for (const question of [
    'Berapa harga dan durasi Uji Bersih?',
    'Apa syarat promo UJI10?',
  ]) {
    const started = Date.now();
    const result = await askGroq(question, [], sources);
    if (!result) failures++;
    console.log(
      JSON.stringify({
        question,
        status: result ? 'PASS' : 'FALLBACK',
        model: result?.model ?? null,
        attempts: result?.attempts ?? null,
        latencyMs: Date.now() - started,
        usage: result
          ? {
              promptTokens: result.promptTokens,
              completionTokens: result.completionTokens,
            }
          : null,
        answer:
          result?.answer ??
          'Provider/model belum tersedia; aplikasi menggunakan fallback sumber.',
      }),
    );
  }
  process.exitCode = failures ? 1 : 0;
}
