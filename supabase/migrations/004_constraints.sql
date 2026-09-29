alter table public.profiles
  add constraint profiles_full_name_length check (full_name is null or char_length(trim(full_name)) between 2 and 120),
  add constraint profiles_phone_length check (phone is null or char_length(trim(phone)) between 8 and 24);

alter table public.addresses
  add constraint addresses_label_not_blank check (char_length(trim(label)) > 0),
  add constraint addresses_recipient_not_blank check (char_length(trim(recipient_name)) > 0),
  add constraint addresses_address_not_blank check (char_length(trim(address)) > 0),
  add constraint addresses_latitude_range check (latitude is null or latitude between -90 and 90),
  add constraint addresses_longitude_range check (longitude is null or longitude between -180 and 180);

alter table public.categories
  add constraint categories_name_key unique (name),
  add constraint categories_name_not_blank check (char_length(trim(name)) > 0);

alter table public.services
  add constraint services_category_name_key unique (category_id, name),
  add constraint services_name_not_blank check (char_length(trim(name)) > 0),
  add constraint services_price_nonnegative check (price >= 0),
  add constraint services_duration_positive check (duration_minutes > 0);

alter table public.cleaners
  add constraint cleaners_phone_key unique (phone),
  add constraint cleaners_name_not_blank check (char_length(trim(full_name)) > 0),
  add constraint cleaners_rating_range check (rating between 0 and 5);

alter table public.bookings
  add constraint bookings_booking_code_key unique (booking_code),
  add constraint bookings_booking_code_format check (booking_code ~ '^CG-[0-9]{8}-[0-9]{4,}$'),
  add constraint bookings_subtotal_nonnegative check (subtotal >= 0),
  add constraint bookings_additional_fee_nonnegative check (additional_fee >= 0),
  add constraint bookings_total_nonnegative check (total_price >= 0),
  add constraint bookings_total_consistent check (total_price = subtotal + additional_fee);

alter table public.cleaner_schedules
  add constraint cleaner_schedules_booking_key unique (booking_id),
  add constraint cleaner_schedules_time_order check (end_time > start_time);

alter table public.cleaner_schedules
  add constraint cleaner_schedules_no_overlap
  exclude using gist (
    cleaner_id with =,
    schedule_period with &&
  )
  where (status = 'scheduled');

alter table public.payments
  add constraint payments_transaction_reference_key unique (transaction_reference),
  add constraint payments_amount_positive check (amount > 0),
  add constraint payments_paid_at_consistent check (
    (payment_status = 'paid' and paid_at is not null)
    or (payment_status <> 'paid')
  );

alter table public.reviews
  add constraint reviews_booking_key unique (booking_id),
  add constraint reviews_rating_range check (rating between 1 and 5);

alter table public.notifications
  add constraint notifications_title_not_blank check (char_length(trim(title)) > 0),
  add constraint notifications_message_not_blank check (char_length(trim(message)) > 0),
  add constraint notifications_type_not_blank check (char_length(trim(type)) > 0);

alter table public.ai_conversations
  add constraint ai_conversations_title_not_blank check (char_length(trim(title)) > 0);

alter table public.ai_messages
  add constraint ai_messages_content_not_blank check (char_length(trim(content)) > 0);

-- One default address per user. NULL/false values are intentionally unrestricted.
create unique index addresses_one_default_per_user_idx
  on public.addresses (user_id)
  where is_default;

-- Adjacent slots are allowed by the half-open range [start, end). Overnight
-- schedules are intentionally rejected by cleaner_schedules_time_order.

