// Only known chat spellings are corrected; never fuzzy-correct IDs, prices, or unknown service names.
const spellings: Record<string, string> = {
  hai: 'bhai haii haai hi hii hy hallo halo helo hello hellow',
  boo: 'booo',
  cleango: 'cleangoo cleanggo clenago',
  bagaimana: 'gmn gmna gimana gmana gimna bgmn bgmna',
  kenapa: 'knp knpa knapa',
  berapa: 'brp brpa bberapa brapa',
  mana: 'mn mna',
  'di mana': 'dmn dmna dimana',
  yang: 'yg',
  dengan: 'dgn dg',
  untuk: 'utk',
  saya: 'sy aku gw gue gua',
  kamu: 'lu lo elu',
  tidak: 'gak ga nggak ngga enggak tdk',
  sudah: 'sdh udh uda udah dah',
  belum: 'blm belom blom',
  saja: 'aja aj',
  pakai: 'pake pkai',
  harga: 'hrga hrg harg harag',
  harganya: 'hrganya hrgny hargny',
  biaya: 'bya biya',
  layanan: 'layann laynan layanann',
  booking: 'boking bokking bookng bookig bookingg',
  pesan: 'pesen',
  'pesanan saya': 'pesenanku pesananku orderku bookingku',
  pesanan: 'pesananan pesananm pesann pesenan',
  jadwal: 'jdwl jadwl jadwalnya',
  alamat: 'alamt almat',
  cleaner: 'clener cleanr cleanner kleaner',
  cleaning: 'clening cleanng cleanning',
  deep: 'dep depp',
  basic: 'basik bassic',
  kost: 'kos',
  kasur: 'mattress matras',
  sofa: 'couch',
  setrika: 'ironing strika',
  tracking: 'traking trackng trcking',
  lokasi: 'loksi lokas',
  status: 'sttus statsu statuss',
  dikerjakan: 'dikerjain dikerjakn',
  selesai: 'selese slsai slesai',
  terlambat: 'terlmbat trlambat',
  telat: 'telatt',
  durasi: 'drasi dursi',
  durasinya: 'drasinya durasiny',
  lama: 'lamanya',
  promo: 'prmo promoo',
  voucher: 'voucer vocer vucher vouchr',
  qris: 'qirs qriss',
  pembayaran: 'pmbayaran pembayran',
  bayar: 'byr byar',
  refund: 'refun refnd',
  batalkan: 'batalin batalakn cancelin',
  pesankan: 'pesenin pesankanin',
  reschedule: 'reskedul reschedul',
  ulasan: 'ulasn ulasnnya',
  riwayat: 'riwayt rwayat',
  disimpan: 'disimpen',
  notifikasi: 'notif notfikasi',
  bantuan: 'bantun',
  terima: 'trima',
  'terima kasih': 'makasih makasi mksh thanks thankyou terimakasih',
  abaikan: 'abaikn abaikann',
  bocorkan: 'bocorin',
  tampilkan: 'tampilin tampilkanlah',
  pelanggan: 'pelanggn pelangan',
  orang: 'org',
  'password saya': 'passwordku',
  'otp saya': 'otpku',
  'pin saya': 'pinku',
  'nik saya': 'nikku',
};
const aliases = new Map<string, string>();
for (const [word, variants] of Object.entries(spellings)) {
  aliases.set(word, word);
  for (const variant of variants.split(' ')) aliases.set(variant, word);
}

export function normalizeChatText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function chatSearchText(value: string): string {
  return normalizeChatText(value)
    .toLowerCase()
    .replace(/[\p{L}\p{N}_/-]+/gu, (word) => {
      if (!/^[\p{L}]+$/u.test(word)) return word;
      return (
        aliases.get(word) ??
        aliases.get(word.replace(/(.)\1{2,}/gu, '$1')) ??
        aliases.get(word.replace(/(.)\1{2,}/gu, '$1$1')) ??
        word
      );
    });
}

const stopWords = new Set(
  'apa apaan yang dan saya kamu itu nya untuk ada berapa bagaimana bisa dapat tolong dong tahu tau saja ya kak min admin bang bro boo ingin mau apakah boleh tentang dengan pada dari di ke'.split(
    ' ',
  ),
);

export function chatTokens(value: string): string[] {
  return [
    ...new Set(chatSearchText(value).match(/[\p{L}\p{N}]+/gu) ?? []),
  ].filter((word) => word.length > 1 && !stopWords.has(word));
}

export function smallTalkReply(value: string): string | null {
  const text = chatSearchText(value)
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .trim();
  if (
    /^(?:(?:boo|kak|min|admin|bang|bro) )?(?:hai|assalamu?alaikum|selamat (?:pagi|siang|sore|malam)|pagi|siang|sore|malam)(?: (?:boo|kak|min|admin|bang|bro))?$/i.test(
      text,
    ) ||
    /^👋[\uFE0F\p{Emoji_Modifier}\s]*$/u.test(value)
  )
    return 'Halo! Saya Boo, asisten informasi CleanGo. Ada yang ingin ditanyakan tentang layanan, booking, pembayaran, atau tracking?';
  if (/^(?:terima kasih)(?: (?:boo|kak|min|admin))?$/.test(text))
    return 'Sama-sama! Kalau ada pertanyaan lain seputar CleanGo, saya siap membantu.';
  return null;
}
