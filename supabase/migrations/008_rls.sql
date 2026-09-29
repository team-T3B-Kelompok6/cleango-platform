alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.categories enable row level security;
alter table public.services enable row level security;
alter table public.cleaners enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.cleaner_schedules enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.addresses from anon, authenticated;
revoke all on table public.categories from anon, authenticated;
revoke all on table public.services from anon, authenticated;
revoke all on table public.cleaners from anon, authenticated;
revoke all on table public.bookings from anon, authenticated;
revoke all on table public.booking_status_history from anon, authenticated;
revoke all on table public.cleaner_schedules from anon, authenticated;
revoke all on table public.payments from anon, authenticated;
revoke all on table public.reviews from anon, authenticated;
revoke all on table public.notifications from anon, authenticated;
revoke all on table public.ai_conversations from anon, authenticated;
revoke all on table public.ai_messages from anon, authenticated;

-- Customer-safe direct Data API surface. Transactional mutations stay behind
-- RPCs that will be introduced in phase 7.
grant select on table public.profiles to authenticated;
grant update (full_name, phone, avatar_url) on table public.profiles to authenticated;

grant select, insert, update, delete on table public.addresses to authenticated;
grant select on table public.categories to authenticated;
grant select on table public.services to authenticated;
grant select on table public.cleaners to authenticated;
grant select on table public.bookings to authenticated;
grant select on table public.booking_status_history to authenticated;
grant select on table public.cleaner_schedules to authenticated;
grant select on table public.payments to authenticated;
grant select on table public.reviews to authenticated;
grant select on table public.notifications to authenticated;
grant update (is_read) on table public.notifications to authenticated;
grant select, insert, update, delete on table public.ai_conversations to authenticated;
grant select, insert, delete on table public.ai_messages to authenticated;

