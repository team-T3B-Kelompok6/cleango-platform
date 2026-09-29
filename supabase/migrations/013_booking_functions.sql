-- Phase 8: trusted booking creation. All price, identity, promo, status, and
-- booking-code values are derived inside the database.
create or replace function public.create_booking(
  p_service_id uuid,
  p_address_id uuid,
  p_booking_date date,
  p_booking_time time,
  p_notes text default null,
  p_promo_code text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := (select auth.uid());
  v_service public.services%rowtype;
  v_address public.addresses%rowtype;
  v_promo public.promo_codes%rowtype;
  v_booking public.bookings%rowtype;
  v_subtotal numeric(12,2);
  v_discount numeric(12,2) := 0;
  v_total numeric(12,2);
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_code_date date := (now() at time zone 'Asia/Jakarta')::date;
  v_code_sequence bigint;
  v_booking_code text;
  v_usage_count bigint;
begin
  if v_customer_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  if not exists (select 1 from public.profiles where id = v_customer_id) then
    raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND';
  end if;

  select * into v_service
  from public.services
  where id = p_service_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'SERVICE_NOT_FOUND';
  end if;

  if not v_service.is_active or not exists (
    select 1 from public.categories
    where id = v_service.category_id and is_active
  ) then
    raise exception using errcode = 'P0001', message = 'SERVICE_INACTIVE';
  end if;

  select * into v_address
  from public.addresses
  where id = p_address_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'ADDRESS_NOT_FOUND';
  end if;

  if v_address.user_id <> v_customer_id then
    raise exception using errcode = 'P0001', message = 'ADDRESS_NOT_OWNED';
  end if;

  v_start_at := timezone('Asia/Jakarta', p_booking_date + p_booking_time);
  v_end_at := v_start_at + make_interval(mins => v_service.duration_minutes);

  if v_start_at <= now() then
    raise exception using errcode = 'P0001', message = 'INVALID_BOOKING_SCHEDULE';
  end if;

  v_subtotal := v_service.price;

  if nullif(upper(trim(p_promo_code)), '') is not null then
    select * into v_promo
    from public.promo_codes
    where code = upper(trim(p_promo_code))
    for update;

    if not found then
      raise exception using errcode = 'P0001', message = 'PROMO_NOT_FOUND';
    end if;

    if not v_promo.is_active or now() < v_promo.start_at or now() >= v_promo.end_at then
      raise exception using errcode = 'P0001', message = 'PROMO_EXPIRED';
    end if;

    if v_subtotal < v_promo.minimum_order then
      raise exception using errcode = 'P0001', message = 'PROMO_INVALID';
    end if;

    if exists (
      select 1 from public.promo_usages
      where promo_id = v_promo.id and user_id = v_customer_id
    ) then
      raise exception using errcode = 'P0001', message = 'PROMO_ALREADY_USED';
    end if;

    if v_promo.usage_limit is not null then
      select count(*) into v_usage_count
      from public.promo_usages
      where promo_id = v_promo.id;

      if v_usage_count >= v_promo.usage_limit then
        raise exception using errcode = 'P0001', message = 'PROMO_USAGE_LIMIT_REACHED';
      end if;
    end if;

    if v_promo.discount_type = 'fixed'::public.discount_type then
      v_discount := v_promo.discount_value;
    else
      v_discount := round(v_subtotal * v_promo.discount_value / 100, 2);
    end if;

    if v_promo.maximum_discount is not null then
      v_discount := least(v_discount, v_promo.maximum_discount);
    end if;
    v_discount := least(v_discount, v_subtotal);
  end if;

  v_total := v_subtotal - v_discount;

  insert into private.booking_code_counters (booking_date, last_value)
  values (v_code_date, 1)
  on conflict (booking_date) do update
    set last_value = private.booking_code_counters.last_value + 1
  returning last_value into v_code_sequence;

  v_booking_code := 'CG-' || to_char(v_code_date, 'YYYYMMDD') || '-'
    || lpad(v_code_sequence::text, 4, '0');

  insert into public.bookings (
    booking_code, customer_id, service_id, address_id,
    booking_date, booking_time, scheduled_start_at, scheduled_end_at,
    notes, subtotal, additional_fee, discount_amount, total_price, status
  ) values (
    v_booking_code, v_customer_id, v_service.id, v_address.id,
    p_booking_date, p_booking_time, v_start_at, v_end_at,
    nullif(trim(p_notes), ''), v_subtotal, 0, v_discount, v_total,
    'pending'::public.booking_status
  )
  returning * into v_booking;

  if v_promo.id is not null then
    insert into public.promo_usages (promo_id, user_id, booking_id)
    values (v_promo.id, v_customer_id, v_booking.id);
  end if;

  insert into public.booking_status_history (
    booking_id, status, description, changed_by
  ) values (
    v_booking.id,
    'pending'::public.booking_status,
    'Booking dibuat dan menunggu konfirmasi.',
    v_customer_id
  );

  return v_booking;
end;
$$;

comment on function public.create_booking(uuid, uuid, date, time, text, text) is
  'Creates a customer booking transactionally. SECURITY DEFINER is required because direct booking/history/promo-usage writes are intentionally denied by RLS and grants.';

revoke all on function public.create_booking(uuid, uuid, date, time, text, text)
  from public, anon;
grant execute on function public.create_booking(uuid, uuid, date, time, text, text)
  to authenticated;
