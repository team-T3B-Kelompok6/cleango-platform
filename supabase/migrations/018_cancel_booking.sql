-- Customer cancellation is a narrow, transactional status change for phase 9.
-- Broader admin status transitions are implemented separately in phase 10.
create or replace function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := (select auth.uid());
  v_booking public.bookings%rowtype;
begin
  if v_customer_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id and customer_id = v_customer_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'BOOKING_NOT_FOUND';
  end if;

  if v_booking.status not in (
    'pending'::public.booking_status,
    'confirmed'::public.booking_status
  ) then
    raise exception using errcode = 'P0001', message = 'INVALID_STATUS_TRANSITION';
  end if;

  update public.bookings
  set status = 'cancelled'::public.booking_status
  where id = v_booking.id
  returning * into v_booking;

  insert into public.booking_status_history (
    booking_id, status, description, changed_by
  ) values (
    v_booking.id,
    'cancelled'::public.booking_status,
    'Booking dibatalkan oleh customer.',
    v_customer_id
  );

  insert into public.notifications (
    user_id, booking_id, title, message, type
  ) values (
    v_customer_id,
    v_booking.id,
    'Pesanan dibatalkan',
    'Pesanan Anda telah dibatalkan.',
    'booking_status'
  );

  return v_booking;
end;
$$;

comment on function public.cancel_booking(uuid) is
  'Cancels an owned pending/confirmed booking and appends history plus notification atomically.';

revoke all on function public.cancel_booking(uuid) from public, anon;
grant execute on function public.cancel_booking(uuid) to authenticated;
