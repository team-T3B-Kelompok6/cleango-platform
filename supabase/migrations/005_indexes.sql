create index addresses_user_id_idx on public.addresses (user_id);
create index services_category_id_idx on public.services (category_id);
create index services_active_category_idx on public.services (category_id, name) where is_active;

create index bookings_customer_id_idx on public.bookings (customer_id);
create index bookings_cleaner_id_idx on public.bookings (cleaner_id) where cleaner_id is not null;
create index bookings_service_id_idx on public.bookings (service_id);
create index bookings_address_id_idx on public.bookings (address_id);
create index bookings_status_idx on public.bookings (status);
create index bookings_booking_date_idx on public.bookings (booking_date);
create index bookings_customer_status_date_idx
  on public.bookings (customer_id, status, booking_date desc, booking_time desc);
create index bookings_admin_queue_idx
  on public.bookings (status, booking_date, booking_time)
  where status in ('pending', 'confirmed', 'cleaner_assigned', 'delayed');

create index booking_status_history_booking_id_idx
  on public.booking_status_history (booking_id, created_at desc);

create index cleaner_schedules_cleaner_id_idx
  on public.cleaner_schedules (cleaner_id, schedule_date, start_time, end_time);
create index cleaner_schedules_status_idx
  on public.cleaner_schedules (status, schedule_date);

create index payments_booking_id_idx on public.payments (booking_id);
create index payments_status_idx on public.payments (payment_status);

-- reviews.booking_id already has a unique btree index from its constraint.
create index reviews_customer_id_idx on public.reviews (customer_id);
create index reviews_cleaner_id_idx on public.reviews (cleaner_id);

create index notifications_user_id_idx
  on public.notifications (user_id, created_at desc);
create index notifications_unread_idx
  on public.notifications (user_id, created_at desc)
  where not is_read;

create index ai_conversations_user_id_idx
  on public.ai_conversations (user_id, updated_at desc);
create index ai_messages_conversation_id_idx
  on public.ai_messages (conversation_id, created_at);

