-- PROFILES
create policy profiles_select_self_or_admin
on public.profiles for select
to authenticated
using (
  ((select auth.uid()) is not null and id = (select auth.uid()))
  or (select private.is_admin())
);

create policy profiles_update_self
on public.profiles for update
to authenticated
using ((select auth.uid()) is not null and id = (select auth.uid()))
with check ((select auth.uid()) is not null and id = (select auth.uid()));

-- ADDRESSES
create policy addresses_select_owner_or_admin
on public.addresses for select
to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy addresses_insert_owner
on public.addresses for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy addresses_update_owner
on public.addresses for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy addresses_delete_owner
on public.addresses for delete
to authenticated
using (user_id = (select auth.uid()));

-- READ-ONLY CATALOG FOR CUSTOMERS
create policy categories_select_active_or_admin
on public.categories for select
to authenticated
using (is_active or (select private.is_admin()));

create policy services_select_active_or_admin
on public.services for select
to authenticated
using (
  (is_active and exists (
    select 1
    from public.categories as c
    where c.id = services.category_id and c.is_active
  ))
  or (select private.is_admin())
);

create policy cleaners_select_active_or_admin
on public.cleaners for select
to authenticated
using (is_active or (select private.is_admin()));

-- BOOKINGS AND DERIVED TRANSACTION DATA
create policy bookings_select_owner_or_admin
on public.bookings for select
to authenticated
using (customer_id = (select auth.uid()) or (select private.is_admin()));

create policy booking_history_select_owner_or_admin
on public.booking_status_history for select
to authenticated
using (
  exists (
    select 1
    from public.bookings as b
    where b.id = booking_status_history.booking_id
      and b.customer_id = (select auth.uid())
  )
  or (select private.is_admin())
);

create policy cleaner_schedules_select_admin
on public.cleaner_schedules for select
to authenticated
using ((select private.is_admin()));

create policy payments_select_owner_or_admin
on public.payments for select
to authenticated
using (
  exists (
    select 1
    from public.bookings as b
    where b.id = payments.booking_id
      and b.customer_id = (select auth.uid())
  )
  or (select private.is_admin())
);

create policy reviews_select_owner_or_admin
on public.reviews for select
to authenticated
using (customer_id = (select auth.uid()) or (select private.is_admin()));

-- NOTIFICATIONS
create policy notifications_select_owner_or_admin
on public.notifications for select
to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy notifications_update_owner
on public.notifications for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- AI DATA
create policy ai_conversations_select_owner_or_admin
on public.ai_conversations for select
to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy ai_conversations_insert_owner
on public.ai_conversations for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy ai_conversations_update_owner
on public.ai_conversations for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy ai_conversations_delete_owner
on public.ai_conversations for delete
to authenticated
using (user_id = (select auth.uid()));

create policy ai_messages_select_owner_or_admin
on public.ai_messages for select
to authenticated
using (
  exists (
    select 1
    from public.ai_conversations as c
    where c.id = ai_messages.conversation_id
      and c.user_id = (select auth.uid())
  )
  or (select private.is_admin())
);

create policy ai_messages_insert_user_message
on public.ai_messages for insert
to authenticated
with check (
  role = 'user'::public.ai_message_role
  and exists (
    select 1
    from public.ai_conversations as c
    where c.id = ai_messages.conversation_id
      and c.user_id = (select auth.uid())
  )
);

create policy ai_messages_delete_owner
on public.ai_messages for delete
to authenticated
using (
  exists (
    select 1
    from public.ai_conversations as c
    where c.id = ai_messages.conversation_id
      and c.user_id = (select auth.uid())
  )
);

