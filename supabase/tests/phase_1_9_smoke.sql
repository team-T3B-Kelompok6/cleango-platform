\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('10000000-0000-0000-0000-000000000001', 'customer1@cleango.test', '{"full_name":"Customer Satu"}'),
  ('10000000-0000-0000-0000-000000000002', 'customer2@cleango.test', '{"full_name":"Customer Dua"}'),
  ('10000000-0000-0000-0000-000000000099', 'admin@cleango.test', '{"full_name":"Admin Test"}');

update public.profiles
set role = 'admin'
where id = '10000000-0000-0000-0000-000000000099';

insert into public.categories (id, name)
values ('20000000-0000-0000-0000-000000000001', 'Smoke Test Category');

insert into public.services (
  id, category_id, name, price, duration_minutes
) values (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'Smoke Test Service', 150000, 120
);

insert into public.addresses (
  id, user_id, label, recipient_name, phone, address, city, province, postal_code
) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Rumah', 'Customer Satu', '081234567890', 'Jalan Test 1', 'Jakarta', 'DKI Jakarta', '10000'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Rumah', 'Customer Dua', '081234567891', 'Jalan Test 2', 'Jakarta', 'DKI Jakarta', '10000');

insert into public.cleaners (id, full_name, phone, status, is_active)
values ('50000000-0000-0000-0000-000000000001', 'Cleaner Test', '081234567899', 'available', true);

insert into public.promo_codes (
  id, code, discount_type, discount_value, minimum_order,
  maximum_discount, start_at, end_at, usage_limit
) values (
  '60000000-0000-0000-0000-000000000001', 'HEMAT10', 'percentage', 10,
  100000, 20000, now() - interval '1 day', now() + interval '1 year', 10
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select id as booking_one_id, booking_code as booking_one_code
from public.create_booking(
  '30000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '2099-01-10', '09:00', 'Smoke booking one', 'HEMAT10'
) \gset

do $$
begin
  if not exists (
    select 1 from public.bookings
    where customer_id = auth.uid()
      and subtotal = 150000
      and discount_amount = 15000
      and total_price = 135000
      and status = 'pending'
  ) then
    raise exception 'create_booking calculation or RLS assertion failed';
  end if;
end;
$$;

reset role;
update public.bookings
set status = 'confirmed'
where id = :'booking_one_id'::uuid;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
set local role authenticated;

select id as booking_two_id
from public.create_booking(
  '30000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000002',
  '2099-01-10', '10:00', 'Smoke booking two', null
) \gset

reset role;
update public.bookings
set status = 'confirmed'
where id = :'booking_two_id'::uuid;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000099', true);
set local role authenticated;

select id, status, cleaner_id
from public.assign_cleaner(
  :'booking_one_id'::uuid,
  '50000000-0000-0000-0000-000000000001'
);

do $$
declare
  v_conflict_seen boolean := false;
begin
  begin
    perform public.assign_cleaner(
      (select id from public.bookings where customer_id = '10000000-0000-0000-0000-000000000002'::uuid),
      '50000000-0000-0000-0000-000000000001'::uuid
    );
  exception when others then
    if sqlerrm = 'CLEANER_SCHEDULE_CONFLICT' then
      v_conflict_seen := true;
    else
      raise;
    end if;
  end;

  if not v_conflict_seen then
    raise exception 'overlapping cleaner schedule was accepted';
  end if;
end;
$$;

do $$
begin
  if (select count(*) from public.cleaner_schedules where booking_id = (select id from public.bookings where customer_id = '10000000-0000-0000-0000-000000000001'::uuid)) <> 1
     or (select count(*) from public.booking_status_history where booking_id = (select id from public.bookings where customer_id = '10000000-0000-0000-0000-000000000001'::uuid) and status = 'cleaner_assigned') <> 1
     or (select count(*) from public.notifications where booking_id = (select id from public.bookings where customer_id = '10000000-0000-0000-0000-000000000001'::uuid) and type = 'booking_status') <> 1 then
    raise exception 'assignment side effects assertion failed';
  end if;
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
set local role authenticated;

do $$
declare
  v_role_escalation_blocked boolean := false;
begin
  if exists (
    select 1 from public.bookings
    where customer_id = '10000000-0000-0000-0000-000000000001'::uuid
  ) or exists (
    select 1 from public.addresses
    where user_id = '10000000-0000-0000-0000-000000000001'::uuid
  ) or exists (
    select 1 from public.notifications
    where user_id = '10000000-0000-0000-0000-000000000001'::uuid
  ) then
    raise exception 'RLS cross-customer isolation assertion failed';
  end if;

  begin
    update public.profiles
    set role = 'admin'
    where id = auth.uid();
  exception when insufficient_privilege then
    v_role_escalation_blocked := true;
  end;

  if not v_role_escalation_blocked then
    raise exception 'customer role escalation was not blocked';
  end if;
end;
$$;

rollback;

\echo 'phase_1_9_smoke: PASS'
