-- Incremental types/extensions for the expanded CleanGo phase 1-9 model.

create extension if not exists pg_trgm with schema extensions;

alter type public.booking_status
  add value if not exists 'departed' after 'cleaner_assigned';

create type public.discount_type as enum ('fixed', 'percentage');
create type public.support_request_type as enum (
  'cleaner_late',
  'cleaner_no_show',
  'location_problem',
  'service_problem',
  'payment_problem',
  'other'
);
create type public.support_request_status as enum (
  'open',
  'in_progress',
  'resolved',
  'closed'
);
create type public.eta_prediction_source as enum ('rule_based', 'maps_api', 'ai');
create type public.booking_risk_type as enum ('delay', 'no_show');
create type public.booking_risk_source as enum ('rule_based', 'ai');

