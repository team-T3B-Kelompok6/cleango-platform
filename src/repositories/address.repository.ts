import { createUserClient } from '../config/supabase.js';
import type { AddressInput } from '../types/domain.js';

function toRow(input: Partial<AddressInput>): Record<string, unknown> {
  return {
    ...(input.label !== undefined ? { label: input.label } : {}),
    ...(input.recipientName !== undefined ? { recipient_name: input.recipientName } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
    ...(input.address !== undefined ? { address: input.address } : {}),
    ...(input.city !== undefined ? { city: input.city } : {}),
    ...(input.province !== undefined ? { province: input.province } : {}),
    ...(input.postalCode !== undefined ? { postal_code: input.postalCode } : {}),
    ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
    ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
    ...(input.isDefault !== undefined ? { is_default: input.isDefault } : {}),
  };
}

const fields = 'id, user_id, label, recipient_name, phone, address, city, province, postal_code, latitude, longitude, is_default, created_at, updated_at';

export const addressRepository = {
  list(accessToken: string, userId: string) {
    return createUserClient(accessToken).from('addresses').select(fields)
      .eq('user_id', userId).order('is_default', { ascending: false }).order('created_at');
  },
  find(accessToken: string, userId: string, id: string) {
    return createUserClient(accessToken).from('addresses').select(fields)
      .eq('user_id', userId).eq('id', id).maybeSingle();
  },
  create(accessToken: string, userId: string, input: AddressInput) {
    return createUserClient(accessToken).from('addresses')
      .insert({ user_id: userId, ...toRow(input) }).select(fields).single();
  },
  update(accessToken: string, userId: string, id: string, input: Partial<AddressInput>) {
    return createUserClient(accessToken).from('addresses').update(toRow(input))
      .eq('user_id', userId).eq('id', id).select(fields).maybeSingle();
  },
  remove(accessToken: string, userId: string, id: string) {
    return createUserClient(accessToken).from('addresses').delete()
      .eq('user_id', userId).eq('id', id).select('id').maybeSingle();
  },
};
