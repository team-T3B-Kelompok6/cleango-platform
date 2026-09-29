-- Idempotent development seed. Run after all migrations.
insert into public.categories (name, description, icon)
values
  ('Rumah', 'Layanan kebersihan rumah', 'home'),
  ('Kantor', 'Layanan kebersihan kantor', 'building'),
  ('Kost', 'Layanan kebersihan kamar kost', 'bed'),
  ('Deep Clean', 'Pembersihan menyeluruh', 'sparkles'),
  ('AC', 'Perawatan dan pembersihan AC', 'snowflake')
on conflict (name) do update
set description = excluded.description, icon = excluded.icon, is_active = true;

insert into public.services (category_id, name, description, price, duration_minutes)
values
  ((select id from public.categories where name = 'Rumah'), 'Basic Home Cleaning', 'Pembersihan rutin rumah', 100000, 120),
  ((select id from public.categories where name = 'Deep Clean'), 'Deep Cleaning', 'Pembersihan rumah menyeluruh', 250000, 240),
  ((select id from public.categories where name = 'Kost'), 'Kost Cleaning', 'Pembersihan kamar kost', 75000, 90),
  ((select id from public.categories where name = 'Kantor'), 'Office Cleaning', 'Pembersihan area kantor', 300000, 240),
  ((select id from public.categories where name = 'Rumah'), 'Sofa Cleaning', 'Pembersihan sofa', 150000, 120),
  ((select id from public.categories where name = 'Rumah'), 'Mattress Cleaning', 'Pembersihan kasur', 140000, 120),
  ((select id from public.categories where name = 'AC'), 'AC Cleaning', 'Cuci dan perawatan AC', 90000, 60)
on conflict (category_id, name) do update
set description = excluded.description,
    price = excluded.price,
    duration_minutes = excluded.duration_minutes,
    is_active = true;

insert into public.cleaners (full_name, phone, status, average_rating)
values
  ('Ari CleanGo', '081200000001', 'available', 4.80),
  ('Budi CleanGo', '081200000002', 'available', 4.70),
  ('Citra CleanGo', '081200000003', 'available', 4.90),
  ('Dewi CleanGo', '081200000004', 'offline', 4.60),
  ('Eko CleanGo', '081200000005', 'available', 4.75)
on conflict (phone) do update
set full_name = excluded.full_name, average_rating = excluded.average_rating, is_active = true;

insert into public.promo_codes (
  code, description, discount_type, discount_value, minimum_order,
  maximum_discount, start_at, end_at, usage_limit
)
values (
  'HEMAT10', 'Diskon 10% untuk development', 'percentage', 10, 50000,
  50000, '2026-01-01T00:00:00+07', '2030-01-01T00:00:00+07', 1000
)
on conflict (code) do update
set description = excluded.description,
    end_at = excluded.end_at,
    is_active = true;

-- Booking/review seed requires a real Supabase Auth profile and its address.
-- It is skipped safely on a fresh project until such a user exists.
do $$
declare
  v_customer uuid;
  v_address uuid;
  v_service uuid;
  v_cleaner uuid;
  v_booking uuid;
  v_price numeric(12,2);
begin
  select id into v_customer from public.profiles order by created_at limit 1;
  select id into v_address from public.addresses where user_id = v_customer order by created_at limit 1;
  select id, price into v_service, v_price from public.services where name = 'Basic Home Cleaning' limit 1;
  select id into v_cleaner from public.cleaners where phone = '081200000001';

  if v_customer is null or v_address is null then
    raise notice 'Booking seed skipped: create an Auth user and address first.';
    return;
  end if;

  insert into public.bookings (
    booking_code, customer_id, cleaner_id, service_id, address_id,
    booking_date, booking_time, scheduled_start_at, scheduled_end_at,
    subtotal, total_price, status
  ) values (
    'CG-20260101-9001', v_customer, v_cleaner, v_service, v_address,
    '2026-01-01', '09:00', '2026-01-01T09:00:00+07', '2026-01-01T11:00:00+07',
    v_price, v_price, 'completed'
  ) on conflict (booking_code) do update set updated_at = now()
  returning id into v_booking;

  insert into public.booking_status_history (booking_id, status, description, changed_by)
  select v_booking, 'completed', 'Development seed booking selesai.', v_customer
  where not exists (
    select 1 from public.booking_status_history
    where booking_id = v_booking and status = 'completed'
  );

  insert into public.reviews (booking_id, customer_id, cleaner_id, service_id, rating, comment)
  values (v_booking, v_customer, v_cleaner, v_service, 5, 'Pelayanan bagus')
  on conflict (booking_id) do nothing;
end;
$$;
