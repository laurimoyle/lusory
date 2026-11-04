-- R32 (drift audit 2026-08-31): intake pools carry dates, never timestamps,
-- and no column joins one pool to another.
--
-- Before: submit_beta_intake wrote referral_responses.submitted_at and
-- email_subscribers.consented_at as now() in one transaction, so an email
-- joined to its referral row by timestamp equality. The retry token also sat
-- on the referral row.
--
-- After: every intake pool records a DATE. The retry token lives in its own
-- table with only a date beside it, and nothing on the referral row points to it.

begin;

-- 1. Idempotency tokens move to their own table.
create table if not exists public.intake_tokens (
  token uuid primary key,
  used_on date not null default current_date
);
comment on table public.intake_tokens is
  'R32: retry-idempotency for /api/intake only. Holds a random token and a date. No email, referral, or play column; nothing references it.';
alter table public.intake_tokens enable row level security;
-- Grants stated explicitly (Supabase stopped auto-granting 2026-10-30). No anon
-- grant: nothing public reads this. RLS on with zero policies keeps every row
-- unreachable except through the service role.
revoke all on table public.intake_tokens from anon, public;
grant select, insert, update, delete on table public.intake_tokens to authenticated, service_role;

insert into public.intake_tokens (token, used_on)
  select request_token, submitted_at::date
  from public.referral_responses
  where request_token is not null
on conflict (token) do nothing;

drop index if exists public.referral_responses_request_token_idx;
alter table public.referral_responses drop column if exists request_token;

-- 2. Timestamps become dates.
drop index if exists public.referral_responses_context_source_idx;
alter table public.referral_responses
  alter column submitted_at drop default,
  alter column submitted_at type date using submitted_at::date,
  alter column submitted_at set default current_date;
alter table public.referral_responses rename column submitted_at to submitted_on;
create index if not exists referral_responses_context_source_idx
  on public.referral_responses (intake_context, source, submitted_on desc);

drop index if exists public.email_subscribers_active_cohort_idx;
alter table public.email_subscribers
  alter column consented_at drop default,
  alter column consented_at type date using consented_at::date,
  alter column consented_at set default current_date,
  alter column unsubscribed_at type date using unsubscribed_at::date;
alter table public.email_subscribers rename column consented_at to consented_on;
alter table public.email_subscribers rename column unsubscribed_at to unsubscribed_on;
create index if not exists email_subscribers_active_cohort_idx
  on public.email_subscribers (cohort, consented_on desc)
  where unsubscribed_on is null;

alter table public.usability_responses
  alter column submitted_at drop default,
  alter column submitted_at type date using submitted_at::date,
  alter column submitted_at set default current_date;
alter table public.usability_responses rename column submitted_at to submitted_on;

drop index if exists public.beta_testimonials_submitted_at_idx;
alter table public.beta_testimonials
  alter column submitted_at drop default,
  alter column submitted_at type date using submitted_at::date,
  alter column submitted_at set default current_date;
alter table public.beta_testimonials rename column submitted_at to submitted_on;
create index if not exists beta_testimonials_submitted_on_idx
  on public.beta_testimonials (submitted_on desc);

-- 3. The atomic intake writes dates and keeps the token off the referral row.
create or replace function public.submit_beta_intake(
  p_request_token uuid,
  p_email text,
  p_cohort text,
  p_source text,
  p_detail text,
  p_intake_context text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  claimed uuid;
begin
  if p_request_token is null
     or p_email is null or char_length(p_email) not between 3 and 254
     or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or p_cohort not in ('updates', 'beta')
     or p_source not in (
       'friend_family', 'therapist_counselor', 'coach_wellness',
       'church_community', 'workplace_team', 'social_media',
       'search', 'event_workshop', 'reddit', 'facebook_group',
       'linkedin', 'researcher_university', 'insurance_wellness',
       'direct_outreach', 'other'
     )
     or p_intake_context not in ('signup', 'beta_gate')
     or (p_cohort = 'beta') <> (p_intake_context = 'beta_gate')
     or (p_detail is not null and char_length(p_detail) not between 1 and 160)
  then
    raise exception 'invalid beta intake';
  end if;

  -- Tokens matter only inside the retry window; clear old ones on every call
  -- so the table never becomes a dated list of sign-up days.
  delete from public.intake_tokens where used_on < current_date - 7;

  insert into public.intake_tokens (token) values (p_request_token)
  on conflict (token) do nothing
  returning token into claimed;

  -- A retry after a lost response is a no-op for the whole intake.
  if claimed is null then return; end if;

  insert into public.referral_responses (source, detail, intake_context)
  values (p_source, p_detail, p_intake_context);

  insert into public.email_subscribers (email, cohort, consented_on, unsubscribed_on)
  values (lower(p_email), p_cohort, current_date, null)
  on conflict (email) do update set
    cohort = excluded.cohort,
    consented_on = excluded.consented_on,
    unsubscribed_on = null;
end;
$$;

revoke execute on function public.submit_beta_intake(uuid, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_beta_intake(uuid, text, text, text, text, text)
  to service_role;

-- 4. Clear any tokens already outside the retry window.
delete from public.intake_tokens where used_on < current_date - 7;

commit;
