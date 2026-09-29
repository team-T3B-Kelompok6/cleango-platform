-- Phase 9: admin-only cleaner assignment with database-enforced overlap safety.
create or replace function public.assign_cleaner(
  p_booking_id uuid,
  p_cleaner_id uuid
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_booking public.bookings%rowtype;
  v_cleaner public.cleaners%rowtype;
begin
  if v_actor_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  if not (select private.is_admin()) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'BOOKING_NOT_FOUND';
  end if;

  if v_booking.status <> 'confirmed'::public.booking_status then
    raise exception using errcode = 'P0001', message = 'INVALID_BOOKING_STATUS';
  end if;

  select * into v_cleaner
  from public.cleaners
  where id = p_cleaner_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'CLEANER_NOT_FOUND';
  end if;

  if not v_cleaner.is_active then
    raise exception using errcode = 'P0001', message = 'CLEANER_NOT_ACTIVE';
  end if;

  begin
    insert into public.cleaner_schedules (
      cleaner_id, booking_id, schedule_date, start_time, end_time,
      start_at, end_at, status
    ) values (
      v_cleaner.id,
      v_booking.id,
      (v_booking.scheduled_start_at at time zone 'Asia/Jakarta')::date,
      (v_booking.scheduled_start_at at time zone 'Asia/Jakarta')::time,
      (v_booking.scheduled_end_at at time zone 'Asia/Jakarta')::time,
      v_booking.scheduled_start_at,
      v_booking.scheduled_end_at,
      'scheduled'::public.schedule_status
    );
  exception
    when exclusion_violation then
      raise exception using errcode = 'P0001', message = 'CLEANER_SCHEDULE_CONFLICT';
    when unique_violation then
      raise exception using errcode = 'P0001', message = 'CLEANER_SCHEDULE_CONFLICT';
  end;

  update public.bookings
  set cleaner_id = v_cleaner.id,
      status = 'cleaner_assigned'::public.booking_status
  where id = v_booking.id
  returning * into v_booking;

  insert into public.booking_status_history (
    booking_id, status, description, changed_by
  ) values (
    v_booking.id,
    'cleaner_assigned'::public.booking_status,
    'Cleaner ' || v_cleaner.full_name || ' telah ditugaskan.',
    v_actor_id
  );

  insert into public.notifications (
    user_id, booking_id, title, message, type
  ) values (
    v_booking.customer_id,
    v_booking.id,
    'Cleaner telah ditugaskan',
    'Cleaner ' || v_cleaner.full_name || ' telah ditugaskan untuk pesanan Anda.',
    'booking_status'
  );

  return v_booking;
end;
$$;

comment on function public.assign_cleaner(uuid, uuid) is
  'Assigns an active cleaner to a confirmed booking. SECURITY DEFINER permits the atomic booking, schedule, history, and notification writes after an explicit admin check.';

revoke all on function public.assign_cleaner(uuid, uuid) from public, anon;
grant execute on function public.assign_cleaner(uuid, uuid) to authenticated;
