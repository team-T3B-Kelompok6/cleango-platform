import { createUserClient } from '../config/supabase.js';
import type { BookingInput } from '../types/domain.js';

const detailFields = `
  id, booking_code, customer_id, cleaner_id, service_id, address_id,
  booking_date, booking_time, scheduled_start_at, scheduled_end_at, notes,
  subtotal, additional_fee, discount_amount, total_price, status, created_at, updated_at,
  services(id, name, duration_minutes, image_url),
  addresses(id, label, recipient_name, phone, address, city, province, postal_code),
  cleaners(id, full_name, phone, photo_url, average_rating),
  payments(id, payment_method, amount, payment_status, transaction_reference, paid_at),
  eta_predictions(id, estimated_arrival_at, estimated_minutes, distance_km, confidence_score, source, generated_at),
  booking_status_history(id, status, description, created_at)
`;

export const bookingRepository = {
  create(accessToken: string, input: BookingInput) {
    return createUserClient(accessToken).rpc('create_booking', {
      p_service_id: input.serviceId,
      p_address_id: input.addressId,
      p_booking_date: input.bookingDate,
      p_booking_time: input.bookingTime,
      p_notes: input.notes ?? null,
      p_promo_code: input.promoCode ?? null,
    });
  },
  list(accessToken: string, userId: string, page: number, limit: number, status?: string) {
    const from = (page - 1) * limit;
    let query = createUserClient(accessToken).from('bookings')
      .select('id, booking_code, booking_date, booking_time, scheduled_start_at, total_price, status, created_at, services(id, name, image_url), cleaners(id, full_name, photo_url)', { count: 'exact' })
      .eq('customer_id', userId).order('created_at', { ascending: false })
      .range(from, from + limit - 1);
    if (status) query = query.eq('status', status);
    return query;
  },
  active(accessToken: string, userId: string) {
    return createUserClient(accessToken).from('bookings')
      .select('id, booking_code, scheduled_start_at, total_price, status, services(id, name, image_url), cleaners(id, full_name, photo_url, average_rating)')
      .eq('customer_id', userId)
      .in('status', ['pending', 'confirmed', 'cleaner_assigned', 'departed', 'on_the_way', 'arrived', 'cleaning', 'delayed'])
      .order('scheduled_start_at');
  },
  detail(accessToken: string, userId: string, id: string) {
    return createUserClient(accessToken).from('bookings').select(detailFields)
      .eq('customer_id', userId).eq('id', id)
      .order('created_at', { referencedTable: 'booking_status_history' }).maybeSingle();
  },
  cancel(accessToken: string, id: string) {
    return createUserClient(accessToken).rpc('cancel_booking', { p_booking_id: id });
  },
};
