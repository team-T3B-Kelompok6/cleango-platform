alter table public.cleaners
  add constraint cleaners_user_id_key unique (user_id);

alter table public.bookings
  drop constraint bookings_total_consistent,
  add constraint bookings_discount_nonnegative check (discount_amount >= 0),
  add constraint bookings_total_consistent check (
    total_price = subtotal + additional_fee - discount_amount
  ),
  add constraint bookings_discount_not_above_gross check (
    discount_amount <= subtotal + additional_fee
  ),
  add constraint bookings_schedule_order check (
    scheduled_end_at > scheduled_start_at
  );

alter table public.cleaner_schedules
  add constraint cleaner_schedules_timestamp_order check (end_at > start_at),
  add constraint cleaner_schedules_no_overlap
  exclude using gist (
    cleaner_id with =,
    schedule_period with &&
  )
  where (status = 'scheduled');

alter table public.service_inclusions
  add constraint service_inclusions_description_not_blank
    check (char_length(trim(description)) > 0),
  add constraint service_inclusions_sort_order_nonnegative check (sort_order >= 0),
  add constraint service_inclusions_service_sort_key unique (service_id, sort_order);

alter table public.cleaner_locations
  add constraint cleaner_locations_latitude_range check (latitude between -90 and 90),
  add constraint cleaner_locations_longitude_range check (longitude between -180 and 180),
  add constraint cleaner_locations_accuracy_nonnegative check (accuracy is null or accuracy >= 0);

alter table public.promo_codes
  add constraint promo_codes_code_key unique (code),
  add constraint promo_codes_code_normalized check (
    code = upper(trim(code)) and char_length(code) between 3 and 40
  ),
  add constraint promo_codes_discount_positive check (discount_value > 0),
  add constraint promo_codes_percentage_range check (
    discount_type <> 'percentage' or discount_value <= 100
  ),
  add constraint promo_codes_minimum_order_nonnegative check (minimum_order >= 0),
  add constraint promo_codes_maximum_discount_positive check (
    maximum_discount is null or maximum_discount > 0
  ),
  add constraint promo_codes_period_order check (end_at > start_at),
  add constraint promo_codes_usage_limit_positive check (usage_limit is null or usage_limit > 0);

alter table public.promo_usages
  add constraint promo_usages_booking_key unique (booking_id),
  add constraint promo_usages_user_promo_key unique (user_id, promo_id);

alter table public.support_requests
  add constraint support_requests_description_not_blank
    check (char_length(trim(description)) > 0);

alter table public.eta_predictions
  add constraint eta_predictions_minutes_nonnegative check (estimated_minutes >= 0),
  add constraint eta_predictions_distance_nonnegative check (distance_km is null or distance_km >= 0),
  add constraint eta_predictions_confidence_range check (
    confidence_score is null or confidence_score between 0 and 1
  );

alter table public.booking_risk_predictions
  add constraint booking_risk_predictions_score_range check (risk_score between 0 and 1),
  add constraint booking_risk_predictions_reason_not_blank check (char_length(trim(reason)) > 0);

alter table public.notifications
  add constraint notifications_type_allowed check (
    type in ('booking_status', 'delay', 'no_show', 'payment', 'promo', 'system')
  );

create index services_name_search_idx
  on public.services using gin (name extensions.gin_trgm_ops)
  where is_active;
create index bookings_scheduled_start_at_idx on public.bookings (scheduled_start_at);
create index bookings_active_schedule_idx
  on public.bookings (scheduled_start_at, status)
  where status in ('confirmed', 'cleaner_assigned', 'departed', 'on_the_way', 'arrived', 'cleaning', 'delayed');
create index reviews_service_id_idx on public.reviews (service_id);
create index service_inclusions_service_id_idx
  on public.service_inclusions (service_id, sort_order);
create index cleaner_locations_cleaner_id_idx
  on public.cleaner_locations (cleaner_id, recorded_at desc);
create index cleaner_locations_booking_id_idx
  on public.cleaner_locations (booking_id, recorded_at desc);
create index promo_usages_promo_id_idx on public.promo_usages (promo_id);
create index promo_usages_user_id_idx on public.promo_usages (user_id, used_at desc);
create index support_requests_booking_id_idx on public.support_requests (booking_id);
create index support_requests_customer_id_idx
  on public.support_requests (customer_id, created_at desc);
create index support_requests_admin_queue_idx
  on public.support_requests (status, created_at)
  where status in ('open', 'in_progress');
create index eta_predictions_booking_id_idx
  on public.eta_predictions (booking_id, generated_at desc);
create index booking_risk_predictions_booking_id_idx
  on public.booking_risk_predictions (booking_id, generated_at desc);
create index booking_risk_predictions_admin_queue_idx
  on public.booking_risk_predictions (risk_type, risk_score desc, generated_at desc)
  where risk_score >= 0.5;

create trigger promo_codes_set_updated_at
  before update on public.promo_codes
  for each row execute function private.set_updated_at();

create trigger support_requests_set_updated_at
  before update on public.support_requests
  for each row execute function private.set_updated_at();

