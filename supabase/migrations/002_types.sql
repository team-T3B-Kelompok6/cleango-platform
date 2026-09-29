create type public.app_role as enum ('customer', 'admin');
create type public.cleaner_status as enum ('available', 'busy', 'offline');
create type public.booking_status as enum (
  'pending',
  'confirmed',
  'cleaner_assigned',
  'on_the_way',
  'arrived',
  'cleaning',
  'completed',
  'cancelled',
  'delayed',
  'no_show'
);
create type public.schedule_status as enum ('scheduled', 'completed', 'cancelled');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type public.ai_message_role as enum ('user', 'assistant', 'system');

