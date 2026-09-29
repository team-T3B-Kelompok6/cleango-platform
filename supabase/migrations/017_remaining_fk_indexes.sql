-- Cover the remaining foreign-key lookup paths used by audit/admin queries.
create index booking_status_history_changed_by_idx
  on public.booking_status_history (changed_by)
  where changed_by is not null;

create index notifications_booking_id_idx
  on public.notifications (booking_id)
  where booking_id is not null;
