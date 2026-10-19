import { listFaqs } from '../model/faq.model.js';
import { findServices } from '../model/service.model.js';
import { findChatOrder, listChatPromos } from '../model/chatbot.model.js';
import { askGroq, minimizeChatText, type ChatSource } from './groq-chat.js';
import { getEnv } from '../config/env.js';
import {
  chatCapabilities,
  chatSafetyReply,
  knowledgeFor,
  pendingOrderReply,
} from './chatbot-knowledge.js';

export interface ChatInput {
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  orderReference?: string;
}
export interface ChatReply {
  answer: string;
  source: 'groq' | 'faq' | 'order' | 'support';
  sources: { id: string; title: string }[];
  model: string | null;
  usage: { promptTokens: number; completionTokens: number } | null;
  attempts: number;
  latencyMs: number;
}
const help =
  'Informasi tersebut belum tersedia. Silakan buka Pusat Bantuan atau hubungi admin melalui aplikasi CleanGo.';
const facts = [
  knowledgeFor('Apa itu CleanGo?')[0]!,
  knowledgeFor('Cara booking?')[0]!,
  knowledgeFor('Kebijakan refund?')[0]!,
];
const orderStatus: Record<string, string> = {
  awaiting_payment: 'Menunggu pembayaran',
  confirmed: 'Dikonfirmasi',
  assigned: 'Cleaner ditugaskan',
  departed: 'Cleaner berangkat',
  en_route: 'Cleaner dalam perjalanan',
  in_progress: 'Sedang dikerjakan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  rescheduled: 'Dijadwalkan ulang',
};
const paymentStatus: Record<string, string> = {
  pending: 'Menunggu pembayaran',
  paid: 'Lunas',
  failed: 'Gagal',
  expired: 'Kedaluwarsa',
  refunded: 'Dikembalikan',
};
const money = (value: number) => 'Rp' + Number(value).toLocaleString('id-ID');
const tokens = (value: string) => [
  ...new Set(
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .split(/\s+/)
      .filter(
        (word) =>
          word.length > 2 &&
          ![
            'apa',
            'yang',
            'dan',
            'saya',
            'itu',
            'nya',
            'untuk',
            'ada',
            'berapa',
            'bagaimana',
            'bisa',
            'tolong',
            'dong',
            'kamu',
            'tau',
            'tahu',
            'brp',
            'gimana',
            'aja',
          ].includes(word),
      ),
  ),
];
export function orderReferenceIn(value: string): string | undefined {
  return (
    value.match(
      /(?:pesanan|order|booking|reservasi)(?:\s*(?:nomor|kode|id|#))*\s*[:#]?\s*([a-z]{1,12}[-/]\d[\w-]*|\d{1,18})\b/i,
    )?.[1] ?? value.match(/\b(?:CL|CG|INV|BOOK)-\d[\w-]*\b/i)?.[0]
  );
}

export async function replyToChat(
  input: ChatInput,
  customerId?: number,
): Promise<ChatReply> {
  const started = Date.now();
  const reply = (
    answer: string,
    source: ChatReply['source'] = 'support',
    sources: ChatSource[] = [],
  ): ChatReply => ({
    answer,
    source,
    sources: sources.map(({ id, title }) => ({ id, title })),
    model: null,
    usage: null,
    attempts: 0,
    latencyMs: Date.now() - started,
  });
  const normalize = (text: string) =>
    text
      .normalize('NFKC')
      .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  const question = normalize(input.message);
  const safetyReply = chatSafetyReply(question);
  if (safetyReply) return reply(safetyReply);
  const respondFromSources = async (
    sources: ChatSource[],
    fallback: ChatSource[],
    history: string[],
  ): Promise<ChatReply> => {
    const generated = await askGroq(question, history, sources);
    if (!generated)
      return fallback.length
        ? reply(
            fallback.map((source) => source.text).join('\n\n'),
            'faq',
            fallback,
          )
        : reply(help);
    return {
      answer: generated.answer,
      source: 'groq',
      sources: sources
        .filter((source) => generated.sourceIds.includes(source.id))
        .map(({ id, title }) => ({ id, title })),
      model: generated.model,
      usage: {
        promptTokens: generated.promptTokens,
        completionTokens: generated.completionTokens,
      },
      attempts: generated.attempts,
      latencyMs: Date.now() - started,
    };
  };
  const previousQuestions = input.history
    .filter((item) => item.role === 'user')
    .slice(-3)
    .map((item) => normalize(item.content));
  const needsContext = (text: string) =>
    /(?:\b(?:itu|tadi|tersebut)\b|harganya|durasinya|luasnya|ukurannya)/i.test(
      text,
    ) &&
    !/cleango|promo|diskon|voucher|booking|bayar|[\p{L}]+\s+cleaning/iu.test(
      text,
    );
  const previousTopic = [...previousQuestions]
    .reverse()
    .find((text) => !needsContext(text));
  const contextHistory =
    needsContext(question) && previousTopic ? [previousTopic] : [];
  const directReference = input.orderReference ?? orderReferenceIn(question);
  const isPrivate =
    Boolean(directReference) ||
    /(?:status|cek|lacak|tracking|posisi|kapan|sampai|sudah|telat|terlambat|lunas).{0,40}(?:pesanan|order|cleaner|petugas|booking)(?:ku|\s+saya)?|(?:pesanan|order|booking)(?:ku|\s+saya)|(?:sudah|belum)\s+(?:bayar|lunas)|cleaner\s+saya|petugas\s+saya/i.test(
      question,
    );
  const followupPrivate =
    question.length < 70 &&
    !/promo|diskon|voucher|harga|tarif|biaya|layanan|cleaning|cara (?:booking|bayar|pesan)|tentang cleango/i.test(
      question,
    ) &&
    /^(?:lalu|terus|bagaimana|gimana|kapan|apakah|yang itu|statusnya|sudah|belum)/i.test(
      question,
    ) &&
    previousQuestions
      .slice(-1)
      .some((value) =>
        /pesanan(?:ku|\s+saya)|orderReference|status pesanan/i.test(value),
      );
  const generalStatusQuestion =
    !directReference &&
    !/(?:pesanan|order|cleaner|petugas)(?:ku|\s+saya)/i.test(question) &&
    /arti|maksud|tahap|apa itu|jelaskan.*status/i.test(question);
  const capabilityQuestion =
    /apa.*(?:bisa|dapat).*(?:laku|bantu)|(?:bisa|dapat)\s+(?:ngapain|apa)|kemampuan|bantu apa|siapa (?:kamu|boo)|fungsi (?:boo|chatbot)/i.test(
      question,
    );
  const databaseEnabled = getEnv().CHATBOT_DATABASE_ENABLED;
  if (capabilityQuestion) return reply(chatCapabilities(databaseEnabled));
  if (/^(?:halo|hai|hello|makasih|terima kasih)[!?. ]*$/i.test(question))
    return reply(
      'Halo! Saya Boo, asisten informasi CleanGo. Apa yang ingin Anda ketahui tentang layanan, booking, pembayaran, atau tracking?',
    );
  const contextQuestion = [question, ...contextHistory].join(' ');
  const generalSources = knowledgeFor(contextQuestion).filter(
    (source) =>
      !databaseEnabled ||
      !['knowledge:price', 'knowledge:promo', 'knowledge:service'].includes(
        source.id,
      ),
  );
  if (!databaseEnabled) {
    if ((isPrivate || followupPrivate) && !generalStatusQuestion)
      return reply(pendingOrderReply);
    const sources = generalSources;
    if (!sources.length)
      return reply(
        'Saya membantu pertanyaan seputar CleanGo. Bisa diperjelas apakah yang ingin ditanyakan tentang layanan, booking, pembayaran, tracking, atau bantuan? Informasi yang belum tersedia tidak akan saya tebak.',
      );
    return respondFromSources(sources, sources.slice(0, 2), contextHistory);
  }
  if ((isPrivate || followupPrivate) && !generalStatusQuestion) {
    if (!customerId)
      return reply(
        'Untuk mengecek pesanan pribadi, masuk menggunakan akun pelanggan yang terhubung ke server CleanGo. Sesi demo lokal belum dapat digunakan untuk membaca pesanan server.',
      );
    const reference =
      directReference ??
      [...previousQuestions].reverse().map(orderReferenceIn).find(Boolean);
    try {
      const order = await findChatOrder(customerId, reference);
      if (!order)
        return reply(
          'Pesanan tidak ditemukan pada akun Anda. Periksa nomor pesanan di aplikasi. Pesanan yang masih tersimpan lokal belum tersedia di server.',
        );
      // Deterministic response: no order details, customer ID, or payment data go to Groq.
      return reply(
        `Pesanan ${order.bookingCode}${reference ? '' : ' (terbaru pada akun Anda)'}: ${order.service}. Status: ${orderStatus[order.status] ?? 'Belum tersedia'}. Jadwal: ${order.date}, ${order.time} WIB. Pembayaran: ${paymentStatus[order.paymentStatus ?? ''] ?? 'Belum tercatat'}.`,
        'order',
      );
    } catch {
      return reply(
        'Data pesanan belum dapat dihubungi. Coba lagi atau buka Pusat Bantuan; status pesanan tidak berubah.',
      );
    }
  }
  const founderQuestion =
    /cleango/i.test(question) &&
    /(?:dibuat|didirikan|pembuat|pendiri|founder)/i.test(question);
  // Carry a topic only for an incomplete follow-up, never for a new explicit topic.
  if (
    !generalSources.length &&
    !/cleango|boo\b|halo|hai\b|hello|terima kasih|layanan|bersih|clean|cuci|sofa|kasur|rumah|kantor|\bac\b|harga|biaya|tarif|promo|diskon|voucher|bayar|payment|qris|dana|gopay|tunai|booking|pesan|jadwal|batal|refund|kebijakan|bantuan|admin|alamat|durasi|berapa lama/i.test(
      contextQuestion,
    )
  )
    return reply(
      'Saya Boo, asisten CleanGo. Saya bisa membantu informasi layanan, harga, promo, cara booking, pembayaran, dan status pesanan Anda.',
    );

  const needsServices =
    /layanan|harga|tarif|biaya|bersih|\bclean(?:ing)?\b|cuci|sofa|kasur|rumah|kantor|\bac\b|durasi|berapa lama/i.test(
      contextQuestion,
    );
  const needsPromos = /promo|diskon|voucher|potongan/i.test(contextQuestion);
  const [faqResult, serviceResult, promoResult] = await Promise.allSettled([
    listFaqs(),
    needsServices
      ? findServices({ search: null, categoryId: null, activeOnly: true })
      : Promise.resolve([]),
    needsPromos ? listChatPromos() : Promise.resolve([]),
  ]);
  const candidates: ChatSource[] = generalSources.length
    ? [...generalSources]
    : [facts[0]!];
  if (faqResult.status === 'fulfilled')
    for (const faq of faqResult.value.filter((item) => item.published))
      candidates.push({
        id: `faq:${faq.id}`,
        title: minimizeChatText(faq.question),
        text: minimizeChatText(faq.answer),
      });
  if (
    founderQuestion &&
    !generalSources.some((source) => source.id === 'knowledge:team') &&
    !candidates.some(
      (source) =>
        source.id.startsWith('faq:') &&
        /dibuat|didirikan|pembuat|pendiri|founder/i.test(source.title),
    )
  )
    return reply(
      'Informasi tentang pembuat atau pendiri CleanGo belum tersedia di sumber resmi Boo. Silakan konfirmasi kepada admin melalui Pusat Bantuan.',
    );
  const requestedNames = [
    ...contextQuestion.matchAll(/([\p{L}]+)\s+cleaning\b/giu),
  ]
    .map((match) => match[1]!.toLowerCase())
    .filter(
      (word) =>
        ![
          'layanan',
          'harga',
          'biaya',
          'jasa',
          'selesai',
          'pengerjaan',
          'proses',
          'waktu',
          'durasi',
          'estimasi',
        ].includes(word),
    );
  const serviceWords = tokens(contextQuestion).filter(
    (word) =>
      ![
        'layanan',
        'cleaning',
        'clean',
        'pembersihan',
        'harga',
        'biaya',
        'durasi',
      ].includes(word),
  );
  const availableServices =
    serviceResult.status === 'fulfilled' ? serviceResult.value : [];
  const missingNames = requestedNames.filter(
    (word) =>
      !availableServices.some((service) => tokens(service.name).includes(word)),
  );
  const areaQuestion =
    /luas|ukuran|\bbrp\s*x|berapa\s*(?:x|kali)|m2|m²|meter/i.test(question);
  const matchedServices = availableServices.filter(
    (service) =>
      !serviceWords.length ||
      (!requestedNames.length &&
        /daftar|jenis layanan|layanan apa|apa saja|semua layanan/i.test(
          question,
        )) ||
      serviceWords.some(
        (word) =>
          tokens(service.name).includes(word) ||
          (!requestedNames.length &&
            tokens(service.categoryName).includes(word)),
      ),
  );
  if (
    needsServices &&
    serviceResult.status === 'fulfilled' &&
    missingNames.length
  )
    return reply(
      `Detail layanan ${missingNames.map((name) => `${name} cleaning`).join(', ')} belum tersedia di katalog aktif. Saya tidak dapat menyamakannya dengan layanan lain atau memastikan harga dan cakupannya. Silakan konfirmasi kepada admin.`,
      'faq',
    );
  if (
    areaQuestion &&
    matchedServices.length &&
    matchedServices.every(
      (service) =>
        !/luas|ukuran|m²|\bm2\b|meter|\d+\s*[x×]\s*\d+/i.test(
          service.description ?? '',
        ),
    )
  )
    return reply(
      `Batas luas atau ukuran area untuk ${matchedServices.map((service) => service.name).join(', ')} belum tercantum pada katalog. Harga dan durasi saja tidak menentukan luas yang dicakup. Silakan konfirmasi ukuran rumah Anda kepada admin.`,
      'faq',
    );
  if (serviceResult.status === 'fulfilled')
    for (const service of matchedServices)
      candidates.push({
        id: `service:${service.id}`,
        title: service.name,
        text: minimizeChatText(
          `${service.name}. Kategori: ${service.categoryName}. Harga katalog ${money(service.price)}. Durasi layanan ${service.durationMinutes} menit. ${service.description ?? ''}`,
        ),
      });
  if (needsServices && serviceResult.status === 'rejected')
    candidates.push({
      id: 'availability:services',
      title: 'Status katalog',
      text: 'Katalog layanan sedang tidak dapat dihubungi. Harga dan ketersediaan layanan belum dapat dipastikan; periksa halaman layanan atau Pusat Bantuan.',
    });
  if (needsPromos) {
    if (promoResult.status === 'rejected')
      candidates.push({
        id: 'availability:promos',
        title: 'Status promo',
        text: 'Data promo sedang tidak dapat dihubungi. Promo aktif belum dapat dipastikan. Silakan periksa checkout atau hubungi admin.',
      });
    else if (!promoResult.value.length)
      candidates.push({
        id: 'availability:promos',
        title: 'Promo aktif',
        text: 'Saat pengecekan ini tidak ditemukan promo aktif dengan periode dan kuota yang tersedia di database. Periksa kembali saat checkout.',
      });
    else
      for (const promo of promoResult.value)
        candidates.push({
          id: `promo:${promo.code}`,
          title: `Promo ${promo.code}`,
          text: minimizeChatText(
            `${promo.name}. Kode ${promo.code}. ${promo.description ?? ''} Diskon ${promo.discountType === 'percentage' ? `${promo.discountValue}%` : money(promo.discountValue)}${promo.maximumDiscount !== null ? `, maksimum ${money(promo.maximumDiscount)}` : ''}. Minimum transaksi ${money(promo.minimumOrder)}. Berakhir ${promo.endsAt} (waktu server database). Syarat akhir dan kuota divalidasi saat checkout; promo ini belum diterapkan oleh chatbot.`,
          ),
        });
  }
  const words = tokens(contextQuestion);
  const ranked = candidates
    .map((source) => ({
      source,
      score: words.reduce(
        (n, word) =>
          n +
          (`${source.title} ${source.text}`.toLowerCase().includes(word)
            ? 1
            : 0),
        0,
      ),
    }))
    .filter(
      (item) =>
        item.score > 0 ||
        item.source.id.startsWith('availability:') ||
        (needsPromos && item.source.id.startsWith('promo:')),
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => item.source);
  const sources = ranked.length ? ranked : [facts[0]!];
  // Provider failure must not dump loosely related context or internal instructions.
  const matchedFaqs = ranked
    .filter(
      (source) =>
        source.id.startsWith('faq:') &&
        tokens(source.title).filter((word) => words.includes(word)).length >= 2,
    )
    .slice(0, 1);
  const fallback = needsPromos
    ? candidates
        .filter((source) => /^(?:promo|availability:promos)/.test(source.id))
        .slice(0, 3)
    : needsServices
      ? candidates
          .filter((source) =>
            /^(?:service|availability:services)/.test(source.id),
          )
          .slice(0, 3)
      : generalStatusQuestion
        ? generalSources.slice(0, 2)
        : matchedFaqs.length
          ? matchedFaqs
          : /batal|refund|jadwal ulang|kebijakan/i.test(question)
            ? [facts[2]!]
            : /booking|pesan|bayar|checkout/i.test(question)
              ? [facts[1]!]
              : /^(?:halo|hai|hello)|apa (?:itu )?cleango/i.test(question)
                ? [facts[0]!]
                : generalSources.slice(0, 2);
  return respondFromSources(
    sources,
    fallback.length ? fallback : generalSources.slice(0, 2),
    contextHistory,
  );
}
