-- Phase 7 completion for tables introduced by the expanded CleanGo design.
alter table public.service_inclusions enable row level security;
alter table public.cleaner_locations enable row level security;
alter table public.promo_codes enable row level security;
alter table public.promo_usages enable row level security;
alter table public.support_requests enable row level security;
alter table public.eta_predictions enable row level security;
alter table public.booking_risk_predictions enable row level security;

revoke all on table public.service_inclusions from anon, authenticated;
revoke all on table public.cleaner_locations from anon, authenticated;
revoke all on table public.promo_codes from anon, authenticated;
revoke all on table public.promo_usages from anon, authenticated;
revoke all on table public.support_requests from anon, authenticated;
revoke all on table public.eta_predictions from anon, authenticated;
revoke all on table public.booking_risk_predictions from anon, authenticated;

grant select on table public.service_inclusions to authenticated;
grant select on table public.cleaner_locations to authenticated;
grant select on table public.promo_codes to authenticated;
grant select on table public.promo_usages to authenticated;
grant select on table public.support_requests to authenticated;
grant select on table public.eta_predictions to authenticated;
grant select on table public.booking_risk_predictions to authenticated;

-- Admin catalog management. Booking, schedule, history, and notification
-- mutations remain behind dedicated RPCs so their invariants cannot be skipped.
grant insert, update, delete on table public.categories to authenticated;
grant insert, update, delete on table public.services to authenticated;
grant insert, update, delete on table public.service_inclusions to authenticated;
grant insert, update, delete on table public.cleaners to authenticated;
grant insert, update, delete on table public.promo_codes to authenticated;

create policy service_inclusions_select_active_or_admin
on public.service_inclusions for select to authenticated
using (
  exists (
    select 1 from public.services as s
    join public.categories as c on c.id = s.category_id
    where s.id = service_inclusions.service_id
      and s.is_active and c.is_active
  )
  or (select private.is_admin())
);

create policy service_inclusions_admin_all
on public.service_inclusions for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy cleaner_locations_select_active_owner_or_admin
on public.cleaner_locations for select to authenticated
using (
  exists (
    select 1 from public.bookings as b
    where b.id = cleaner_locations.booking_id
      and b.customer_id = (select auth.uid())
      and b.cleaner_id = cleaner_locations.cleaner_id
      and b.status in (
        'cleaner_assigned'::public.booking_status,
        'departed'::public.booking_status,
        'on_the_way'::public.booking_status,
        'arrived'::public.booking_status,
        'cleaning'::public.booking_status,
        'delayed'::public.booking_status
      )
  )
  or (select private.is_admin())
);

create policy promo_codes_select_usable_or_admin
on public.promo_codes for select to authenticated
using (
  (is_active and now() >= start_at and now() < end_at)
  or (select private.is_admin())
);

create policy promo_codes_admin_all
on public.promo_codes for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy promo_usages_select_owner_or_admin
on public.promo_usages for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy support_requests_select_owner_or_admin
on public.support_requests for select to authenticated
using (customer_id = (select auth.uid()) or (select private.is_admin()));

create policy eta_predictions_select_owner_or_admin
on public.eta_predictions for select to authenticated
using (
  exists (
    select 1 from public.bookings as b
    where b.id = eta_predictions.booking_id
      and b.customer_id = (select auth.uid())
  )
  or (select private.is_admin())
);

create policy booking_risk_predictions_select_admin
on public.booking_risk_predictions for select to authenticated
using ((select private.is_admin()));

create policy categories_admin_all
on public.categories for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy services_admin_all
on public.services for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy cleaners_admin_all
on public.cleaners for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
