import { listFaqs } from '../model/faq.model.js';
import { findServices } from '../model/service.model.js';
import { findChatOrder, listChatPromos } from '../model/chatbot.model.js';
import { askGroq, minimizeChatText, type ChatSource } from './groq-chat.js';
import { getEnv } from '../config/env.js';
import {
  chatSearchText,
  chatTokens,
  normalizeChatText,
  smallTalkReply,
} from './chatbot-text.js';
import {
  chatCapabilities,
  chatSafetyReply,
  knowledgeFor,
  pendingOrderReply,
  policyTopicsFor,
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
const policyUnavailable = (topics: string[], reason: string): ChatSource => ({
  id: 'availability:policy',
  title: 'Status kebijakan resmi',
  text: `${reason} Ketentuan ${topics.join(', ')} belum dipastikan. Silakan konfirmasi melalui Pusat Bantuan agar admin dapat memeriksa ketentuan yang berlaku, ya. Saya belum bisa memastikan persetujuan atau pengembalian uang melalui chat.`,
});
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
const tokens = chatTokens;
const clarification =
  'Boleh jelaskan sedikit lagi, ya? Mau dibantu soal layanan, booking, pembayaran, promo, atau tracking CleanGo?';
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
    answer:
      answer.length <= 2500
        ? answer
        : answer.slice(0, 2350).trimEnd() +
          '\n\nInformasi lebih lengkap dapat diperiksa pada halaman layanan atau Pusat Bantuan.',
    source,
    sources: sources.map(({ id, title }) => ({ id, title })),
    model: null,
    usage: null,
    attempts: 0,
    latencyMs: Date.now() - started,
  });
  const originalQuestion = normalizeChatText(input.message);
  const question = chatSearchText(originalQuestion);
  const safetyReply =
    chatSafetyReply(originalQuestion) ?? chatSafetyReply(question);
  if (safetyReply) return reply(safetyReply);
  const socialReply = smallTalkReply(originalQuestion);
  if (socialReply) return reply(socialReply);
  const respondFromSources = async (
    sources: ChatSource[],
    fallback: ChatSource[],
    history: string[],
  ): Promise<ChatReply> => {
    // Availability and policies are server facts, not conclusions for the LLM to guess.
    if (
      policyTopicsFor([question, ...history].join(' ')).length ||
      (fallback.some((source) => source.id.startsWith('service:')) &&
        fallback.some((source) => source.id.startsWith('promo:'))) ||
      [...sources, ...fallback].some((source) =>
        source.id.startsWith('availability:'),
      )
    ) {
      return fallback.length
        ? reply(
            fallback.map((source) => source.text).join('\n\n'),
            'faq',
            fallback,
          )
        : reply(help);
    }
    const generated = await askGroq(originalQuestion, history, sources);
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
    .map((item) => normalizeChatText(item.content));
  const needsContext = (text: string) =>
    /(?:\b(?:itu|tadi|tersebut)\b|harganya|durasinya|luasnya|ukurannya|^(?:(?:berapa )?(?:harga|biaya|tarif|durasi|luas|ukuran)(?:nya)?(?: berapa)?|berapa lama)(?:\s+(?:ya|dong|saja))?[?!. ]*$)/i.test(
      chatSearchText(text),
    ) &&
    !/cleango|promo|diskon|voucher|booking|bayar|[\p{L}]+\s+cleaning/iu.test(
      chatSearchText(text),
    );
  const previousTopic = [...previousQuestions]
    .reverse()
    .find((text) => !needsContext(text));
  const contextHistory =
    needsContext(question) && previousTopic ? [previousTopic] : [];
  const promotionQuestion = /\b(?:promo|diskon|voucher|kupon)\b/i.test(
    question,
  );
  const directReference =
    input.orderReference ??
    (promotionQuestion &&
    !/\b(?:pesanan|order|booking|reservasi)\b/i.test(question)
      ? undefined
      : orderReferenceIn(originalQuestion));
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
      .some(
        (value) =>
          Boolean(orderReferenceIn(value)) ||
          /pesanan(?:ku|\s+saya)|orderReference|status pesanan/i.test(
            chatSearchText(value),
          ),
      );
  const generalStatusQuestion =
    !directReference &&
    !/(?:pesanan|order|cleaner|petugas)(?:ku|\s+saya)/i.test(question) &&
    /arti|maksud|tahap|apa itu|jelaskan.*status|status.*apa saja|cara.*(?:cek|lihat|melihat).*status/i.test(
      question,
    );
  const capabilityQuestion =
    /apa.*(?:bisa|dapat).*(?:laku|bantu)|(?:bisa|dapat)\s+(?:ngapain|apa)|kemampuan|bantu apa|siapa (?:kamu|boo)|(?:fitur|fungsi) (?:kamu|boo|chatbot)|kamu (?:ini )?siapa/i.test(
      question,
    );
  const databaseEnabled = getEnv().CHATBOT_DATABASE_ENABLED;
  if (capabilityQuestion) return reply(chatCapabilities(databaseEnabled));
  const contextQuestion = chatSearchText(
    [question, ...contextHistory].join(' '),
  );
  if (
    needsContext(question) &&
    !contextHistory.length &&
    !directReference &&
    (!knowledgeFor(question).length ||
      /^(?:berapa|harga|biaya|tarif|durasi|luas|ukuran)/i.test(question))
  )
    return reply(
      'Layanan mana yang ingin ditanyakan, ya? Kirim nama yang tampil di aplikasi supaya saya bisa bantu cek harga, durasi, atau cakupannya.',
    );
  const matchedKnowledge = knowledgeFor(contextQuestion);
  let generalSources = matchedKnowledge.filter(
    (source) =>
      ![
        'knowledge:price',
        'knowledge:promo',
        'knowledge:service',
        'knowledge:policy',
      ].includes(source.id),
  );
  const explainsEta =
    generalSources.some((source) => source.id === 'knowledge:eta') &&
    /beda|arti|maksud|apa itu/i.test(question) &&
    !/\b(?:basic|home|deep|office|kost|sofa|ac|cuci)\b/i.test(question);
  const requestedPolicies = policyTopicsFor(contextQuestion);
  const guidanceIds = [
    'knowledge:booking',
    'knowledge:payment',
    'knowledge:address',
  ];
  const generalGuidance =
    generalSources.some((source) => guidanceIds.includes(source.id)) &&
    !/\b(?:harga|tarif|biaya|durasi|luas|ukuran|basic|home|deep|office|kost|sofa|kasur|ac|cuci|setrika|fogging|karpet|motor|mobil)\b|[\p{L}]+\s+cleaning\b/iu.test(
      contextQuestion,
    );
  const needsServices =
    !explainsEta &&
    !generalGuidance &&
    (!requestedPolicies.length ||
      /\b(?:harga|tarif|durasi|basic|home|deep|office|kost|sofa|kasur|ac|cuci)\b/i.test(
        contextQuestion,
      )) &&
    /layanan|harga|tarif|biaya|bersih|\bclean(?:ing)?\b|cuci|sofa|kasur|rumah|kantor|kost|setrika|ironing|fogging|karpet|motor|mobil|\bac\b|durasi|berapa lama|luas|ukuran/i.test(
      contextQuestion,
    );
  const needsPromos = /\b(?:promo|diskon|voucher|kupon|potongan)\b/i.test(
    contextQuestion,
  );
  // Static knowledge explains app steps, never fills gaps in business tables.
  if (needsServices || needsPromos || requestedPolicies.length)
    generalSources = generalSources.filter((source) =>
      guidanceIds.includes(source.id),
    );
  if (!databaseEnabled) {
    if ((isPrivate || followupPrivate) && !generalStatusQuestion)
      return reply(pendingOrderReply);
    const sources: ChatSource[] = [];
    if (needsServices)
      sources.push({
        id: 'availability:services',
        title: 'Status katalog',
        text: 'Data katalog belum terhubung ke Boo, masih menunggu integrasi database. Harga, durasi, cakupan, bahan, dan ketersediaan layanan belum dipastikan. Silakan periksa detail layanan atau Pusat Bantuan, ya.',
      });
    if (needsPromos)
      sources.push({
        id: 'availability:promos',
        title: 'Status promo',
        text: 'Data promo belum terhubung ke Boo. Saya belum dapat memastikan ada atau tidaknya promo aktif. Silakan periksa checkout atau Pusat Bantuan, ya.',
      });
    if (requestedPolicies.length)
      sources.push(
        policyUnavailable(
          requestedPolicies,
          'FAQ resmi belum terhubung ke Boo.',
        ),
      );
    sources.push(...generalSources.slice(0, 2));
    if (!sources.length) return reply(clarification);
    return respondFromSources(sources, sources, contextHistory);
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
    !matchedKnowledge.length &&
    !/cleango|boo\b|halo|hai\b|hello|terima kasih|layanan|bersih|clean|cuci|sofa|kasur|rumah|kantor|\bac\b|harga|biaya|tarif|promo|diskon|voucher|bayar|payment|qris|dana|gopay|tunai|booking|pesan|jadwal|batal|refund|kebijakan|bantuan|admin|alamat|durasi|berapa lama/i.test(
      contextQuestion,
    )
  )
    return reply(clarification);

  const [faqResult, serviceResult, promoResult] = await Promise.allSettled([
    listFaqs(),
    needsServices
      ? findServices({ search: null, categoryId: null, activeOnly: true })
      : Promise.resolve([]),
    needsPromos ? listChatPromos() : Promise.resolve([]),
  ]);
  const words = tokens(contextQuestion);
  const faqSources: ChatSource[] = [];
  if (faqResult.status === 'fulfilled')
    for (const faq of faqResult.value.filter((item) => item.published)) {
      const title = minimizeChatText(faq.question);
      const topics = knowledgeFor(title);
      const policyMatch = policyTopicsFor(title, false).some((topic) =>
        requestedPolicies.includes(topic),
      );
      const businessFaq =
        topics.some((source) =>
          ['knowledge:price', 'knowledge:promo', 'knowledge:policy'].includes(
            source.id,
          ),
        ) ||
        (topics.some((source) => source.id === 'knowledge:service') &&
          !topics.some((source) => guidanceIds.includes(source.id)));
      if (
        !policyMatch &&
        (needsServices ||
          needsPromos ||
          requestedPolicies.length ||
          businessFaq)
      )
        continue;
      if (
        policyMatch ||
        topics.some((topic) =>
          generalSources.some((source) => source.id === topic.id),
        ) ||
        tokens(title).filter((word) => words.includes(word)).length >= 2
      )
        faqSources.push({
          id: `faq:${faq.id}`,
          title,
          text: minimizeChatText(faq.answer),
        });
    }
  const faqTopics = new Set(
    faqSources.flatMap((source) =>
      knowledgeFor(source.title).map((topic) => topic.id),
    ),
  );
  generalSources = generalSources.filter((source) => !faqTopics.has(source.id));
  const candidates: ChatSource[] = [...generalSources, ...faqSources];
  const promoFallback: ChatSource[] = [];
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
  const subjects = tokens(contextQuestion).filter((word) =>
    [
      'motor',
      'mobil',
      'ac',
      'sofa',
      'kasur',
      'karpet',
      'setrika',
      'fogging',
    ].includes(word),
  );
  const missingSubjects = subjects.filter(
    (word) =>
      !availableServices.some((service) => tokens(service.name).includes(word)),
  );
  const missingNames = requestedNames.filter(
    (word) =>
      !availableServices.some((service) => tokens(service.name).includes(word)),
  );
  const areaQuestion =
    /luas|ukuran|\bbrp\s*x|berapa\s*(?:x|kali)|m2|m²|meter/i.test(question);
  const matchedServices = availableServices.filter((service) =>
    subjects.length
      ? subjects.some((word) => tokens(service.name).includes(word))
      : !serviceWords.length ||
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
    (missingNames.length || missingSubjects.length)
  )
    return reply(
      `Detail layanan ${[...missingNames.map((name) => `${name} cleaning`), ...missingSubjects].join(', ')} belum tersedia di katalog aktif. Saya tidak dapat menyamakannya dengan layanan lain atau memastikan harga dan cakupannya. Silakan konfirmasi kepada admin.`,
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
  if (
    needsServices &&
    serviceResult.status === 'fulfilled' &&
    !matchedServices.length
  )
    return reply(
      'Saya belum menemukan layanan yang cocok dengan nama itu di katalog aktif. Boleh kirim nama layanan yang tampil di aplikasi, ya? Untuk layanan khusus, Anda juga bisa konfirmasi melalui Pusat Bantuan.',
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
      for (const promo of promoResult.value) {
        const terms = `${promo.name}. Kode ${promo.code}. Diskon ${promo.discountType === 'percentage' ? `${promo.discountValue}%` : money(promo.discountValue)}${promo.maximumDiscount !== null ? `, maksimum ${money(promo.maximumDiscount)}` : ''}. Minimum transaksi ${money(promo.minimumOrder)}. Berakhir ${promo.endsAt} (waktu server database). Syarat akhir dan kuota divalidasi saat checkout; promo ini belum diterapkan oleh chatbot.`;
        const source = {
          id: `promo:${promo.code}`,
          title: `Promo ${promo.code}`,
          text: minimizeChatText(terms),
        };
        promoFallback.push(source);
        candidates.push({
          ...source,
          text: minimizeChatText(`${terms} ${promo.description ?? ''}`),
        });
      }
  }
  const policyFaqs = faqSources
    .filter((source) =>
      policyTopicsFor(source.title, false).some((topic) =>
        requestedPolicies.includes(topic),
      ),
    )
    .slice(0, 3);
  const missingPolicies = requestedPolicies.filter(
    (topic) =>
      !policyFaqs.some((source) =>
        policyTopicsFor(source.title, false).includes(topic),
      ),
  );
  if (missingPolicies.length)
    candidates.push(
      policyUnavailable(
        missingPolicies,
        faqResult.status === 'rejected'
          ? 'FAQ resmi sedang tidak dapat dihubungi.'
          : 'Ketentuan ini belum tercantum pada FAQ resmi.',
      ),
    );
  const ranked = candidates
    .map((source) => {
      const sourceWords = new Set(tokens(`${source.title} ${source.text}`));
      return {
        source,
        score: words.reduce(
          (n, word) => n + (sourceWords.has(word) ? 1 : 0),
          0,
        ),
      };
    })
    .filter(
      (item) =>
        item.score > 0 ||
        item.source.id.startsWith('faq:') ||
        generalSources.some((source) => source.id === item.source.id) ||
        (needsServices && item.source.id.startsWith('service:')) ||
        item.source.id.startsWith('availability:') ||
        (needsPromos && item.source.id.startsWith('promo:')),
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => item.source);
  if (!ranked.length) return reply(clarification);
  const sources = ranked;
  // Provider failure must not dump loosely related context or internal instructions.
  const matchedFaqs = ranked
    .filter((source) => source.id.startsWith('faq:'))
    .slice(0, 1);
  const fallback: ChatSource[] = [];
  if (needsServices)
    fallback.push(
      ...(serviceResult.status === 'fulfilled'
        ? matchedServices.slice(0, 3).map((service) => ({
            id: `service:${service.id}`,
            title: service.name,
            text: minimizeChatText(
              `${service.name}: harga katalog ${money(service.price)}. Durasi layanan ${service.durationMinutes} menit.`,
            ),
          }))
        : candidates.filter((source) => source.id === 'availability:services')),
    );
  if (needsPromos)
    fallback.push(
      ...[
        ...promoFallback,
        ...candidates.filter((source) => source.id === 'availability:promos'),
      ].slice(0, 3),
    );
  if (requestedPolicies.length) {
    fallback.push(...policyFaqs);
    fallback.push(
      ...candidates.filter((source) => source.id === 'availability:policy'),
    );
  }
  fallback.push(
    ...(needsServices || needsPromos || requestedPolicies.length
      ? generalSources
          .filter((source) => guidanceIds.includes(source.id))
          .slice(0, 2)
      : matchedFaqs.length
        ? matchedFaqs
        : generalSources.slice(0, 2)),
  );
  return respondFromSources(
    sources,
    fallback.length ? fallback : generalSources.slice(0, 2),
    contextHistory,
  );
}
