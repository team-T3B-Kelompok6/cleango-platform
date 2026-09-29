-- Extend the baseline schema without rewriting migrations already applied.

alter table public.cleaners
  rename column rating to average_rating;

alter table public.cleaners
  add column user_id uuid references public.profiles(id) on delete set null;

alter table public.bookings
  add column scheduled_start_at timestamptz,
  add column scheduled_end_at timestamptz,
  add column discount_amount numeric(12,2) not null default 0,
  add column estimated_arrival_at timestamptz;

update public.bookings
set
  scheduled_start_at = timezone('Asia/Jakarta', booking_date + booking_time),
  scheduled_end_at = timezone('Asia/Jakarta', booking_date + booking_time)
    + interval '1 minute' * (
      select s.duration_minutes
      from public.services as s
      where s.id = bookings.service_id
    );

alter table public.bookings
  alter column scheduled_start_at set not null,
  alter column scheduled_end_at set not null;

alter table public.cleaner_schedules
  drop constraint cleaner_schedules_no_overlap,
  drop column schedule_period;

alter table public.cleaner_schedules
  add column start_at timestamptz,
  add column end_at timestamptz;

update public.cleaner_schedules
set
  start_at = timezone('Asia/Jakarta', schedule_date + start_time),
  end_at = timezone('Asia/Jakarta', schedule_date + end_time);

alter table public.cleaner_schedules
  alter column start_at set not null,
  alter column end_at set not null,
  add column schedule_period tstzrange generated always as (
    tstzrange(start_at, end_at, '[)')
  ) stored;

alter table public.reviews
  add column service_id uuid references public.services(id) on delete restrict;

update public.reviews as r
set service_id = b.service_id
from public.bookings as b
where b.id = r.booking_id;

alter table public.reviews
  alter column service_id set not null;

create table public.service_inclusions (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  description text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.cleaner_locations (
  id uuid primary key default gen_random_uuid(),
  cleaner_id uuid not null references public.cleaners(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  latitude numeric(9,6) not null,
  longitude numeric(9,6) not null,
  accuracy numeric(8,2),
  recorded_at timestamptz not null default now()
);

create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  description text,
  discount_type public.discount_type not null,
  discount_value numeric(12,2) not null,
  minimum_order numeric(12,2) not null default 0,
  maximum_discount numeric(12,2),
  start_at timestamptz not null,
  end_at timestamptz not null,
  usage_limit integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.promo_usages (
  id uuid primary key default gen_random_uuid(),
  promo_id uuid not null references public.promo_codes(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  booking_id uuid not null references public.bookings(id) on delete restrict,
  used_at timestamptz not null default now()
);

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  type public.support_request_type not null,
  description text not null,
  status public.support_request_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.eta_predictions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  estimated_arrival_at timestamptz not null,
  estimated_minutes integer not null,
  distance_km numeric(10,2),
  confidence_score numeric(5,4),
  source public.eta_prediction_source not null default 'rule_based',
  generated_at timestamptz not null default now()
);

create table public.booking_risk_predictions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  risk_type public.booking_risk_type not null,
  risk_score numeric(5,4) not null,
  reason text not null,
  source public.booking_risk_source not null default 'rule_based',
  generated_at timestamptz not null default now()
);

create table private.booking_code_counters (
  booking_date date primary key,
  last_value bigint not null
);

revoke all on table private.booking_code_counters from public, anon, authenticated;

