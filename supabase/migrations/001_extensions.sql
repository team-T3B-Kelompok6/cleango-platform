-- CleanGo phase 1-6: required PostgreSQL extensions.
-- No explicit extension versions: Supabase installs the supported default.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

create schema if not exists private;

revoke all on schema private from public;

