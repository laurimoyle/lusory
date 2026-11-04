-- R23 / R29: the 7-day sweep of never-confirmed sign-ins.
--
-- NOT APPLIED. Canon: the sweep and its request-inventory line ship together,
-- in the accounts release-assembly commit, never separately.
--
-- Why it exists: /api/auth/request uses create_user: true so the endpoint
-- answers identically for known and unknown addresses (no enumeration
-- oracle). The cost is an auth row for every address that asks for a code
-- and never uses it. This removes those rows after seven days.
--
-- Scope: auth users whose email was never confirmed, created more than seven
-- days ago, with no players row. A confirmed user, or anyone with a players
-- row, is never touched.

create extension if not exists pg_cron;

create or replace function public.sweep_unconfirmed_auth_users()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare removed integer;
begin
  delete from auth.users u
  where u.email_confirmed_at is null
    and u.created_at < now() - interval '7 days'
    and not exists (select 1 from public.players p where p.auth_user_id = u.id);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke execute on function public.sweep_unconfirmed_auth_users() from public, anon, authenticated;
grant execute on function public.sweep_unconfirmed_auth_users() to service_role;

-- Daily at 09:17 UTC.
select cron.schedule('lusory-unconfirmed-sweep', '17 9 * * *',
  $$select public.sweep_unconfirmed_auth_users();$$);
