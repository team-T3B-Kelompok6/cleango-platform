-- Non-exposed helper used by RLS policies. SECURITY DEFINER is required to
-- avoid recursive RLS while reading public.profiles.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    exists (
      select 1
      from public.profiles as p
      where p.id = (select auth.uid())
        and p.role = 'admin'::public.app_role
    ),
    false
  );
$$;

revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

-- Auth trigger helper. The value supplied as role in user metadata is ignored.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, avatar_url, role)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), ''),
    'customer'::public.app_role
  );

  return new;
exception
  when unique_violation then
    raise exception using
      errcode = '23505',
      message = 'PROFILE_ALREADY_EXISTS';
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

