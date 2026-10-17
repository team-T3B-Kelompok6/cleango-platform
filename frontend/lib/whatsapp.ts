/** Convert local Indonesian or explicit international numbers to click-to-chat format. */
export function whatsappNumber(phone: string): string | null {
  const value = phone.trim();
  if (!value || !/^\+?[\d\s().-]+$/.test(value)) return null;
  let digits = value.replace(/\D/g, '');
  if (value.startsWith('+')) {
    // An explicit country code must not be interpreted as a local number.
  } else if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  else if (digits.startsWith('8')) digits = '62' + digits;
  else if (!digits.startsWith('62')) return null;
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

export function whatsappLink(phone: string, message?: string): string | null {
  const number = whatsappNumber(phone);
  if (!number) return null;
  return (
    'https://wa.me/' +
    number +
    (message ? '?text=' + encodeURIComponent(message) : '')
  );
}
