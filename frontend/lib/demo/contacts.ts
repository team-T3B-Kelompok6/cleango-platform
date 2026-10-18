// Fictional visual-preview contacts. Delivery must remain simulated for DEMO IDs.
export function sampleContact(
  kind: 'customer' | 'staff',
  number: number,
  name: string,
) {
  const suffix = String(number).padStart(2, '0');
  const local = name
    .replace(/\[UJI(?: UTS)?\]\s*/g, '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '');
  return {
    phone:
      kind === 'customer' ? '0812-8456-20' + suffix : '0813-7264-10' + suffix,
    email: local + '@example.com',
  };
}
