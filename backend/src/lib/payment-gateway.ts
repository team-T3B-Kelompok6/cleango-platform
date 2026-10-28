import { createHmac, timingSafeEqual } from 'node:crypto';

export type PaymentMethod = 'qris' | 'dana' | 'gopay' | 'cash';

export interface PaymentCharge {
  method: PaymentMethod;
  amount: number;
  bookingId: number;
}

export interface PaymentChargeResult {
  status: 'pending' | 'paid';
  reference: string | null;
}

export interface PaymentWebhookEvent {
  bookingId: number;
  status: 'paid' | 'failed' | 'expired';
  amount: number;
  reference: string | null;
}

/**
 * Gateway boundary. Cash is collected on site, so it needs no provider; digital
 * methods stay unavailable until a real provider is configured.
 */
export interface PaymentGateway {
  readonly name: string;
  supports(method: PaymentMethod): boolean;
  createCharge(charge: PaymentCharge): Promise<PaymentChargeResult>;
  verifyWebhook(
    rawBody: Buffer,
    signature: string | undefined,
    secret: string | undefined,
  ): boolean;
}

export const manualGateway: PaymentGateway = {
  name: 'manual',
  supports: (method) => method === 'cash',
  async createCharge() {
    return { status: 'pending', reference: null };
  },
  verifyWebhook(rawBody, signature, secret) {
    if (!secret || !signature) return false;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const given = Buffer.from(signature.trim().toLowerCase());
    const wanted = Buffer.from(expected);
    return given.length === wanted.length && timingSafeEqual(given, wanted);
  },
};

export function gatewayFor(method: PaymentMethod): PaymentGateway | null {
  return manualGateway.supports(method) ? manualGateway : null;
}
