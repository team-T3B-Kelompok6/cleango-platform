-- The original local-time-only constraint rejected a valid service that starts
-- before midnight and ends the next day. The timestamptz range constraint is
-- now the authoritative ordering and overlap protection.
alter table public.cleaner_schedules
  drop constraint cleaner_schedules_time_order;
