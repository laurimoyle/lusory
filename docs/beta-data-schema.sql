-- Beta cohort labels preserve separate email and referral pools.
alter table public.email_subscribers
  add column if not exists cohort text not null default 'updates';

alter table public.email_subscribers
  drop constraint if exists email_subscribers_cohort_check;
alter table public.email_subscribers
  add constraint email_subscribers_cohort_check
  check (cohort in ('updates', 'beta'));

create index if not exists email_subscribers_active_cohort_idx
  on public.email_subscribers (cohort, consented_at desc)
  where unsubscribed_at is null;

alter table public.referral_responses
  add column if not exists intake_context text not null default 'signup';

alter table public.referral_responses
  add column if not exists request_token uuid;

alter table public.referral_responses
  drop constraint if exists referral_responses_source;
alter table public.referral_responses
  add constraint referral_responses_source check (source in (
    'friend_family', 'therapist_counselor', 'coach_wellness',
    'church_community', 'workplace_team', 'social_media',
    'search', 'event_workshop', 'reddit', 'facebook_group',
    'linkedin', 'researcher_university', 'insurance_wellness',
    'direct_outreach', 'other'
  ));

alter table public.referral_responses
  drop constraint if exists referral_responses_intake_context_check;
alter table public.referral_responses
  add constraint referral_responses_intake_context_check
  check (intake_context in ('signup', 'beta_gate'));

create index if not exists referral_responses_context_source_idx
  on public.referral_responses (intake_context, source, submitted_at desc);

create unique index if not exists referral_responses_request_token_idx
  on public.referral_responses (request_token)
  where request_token is not null;

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
  inserted_referral uuid;
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

  insert into public.referral_responses
    (source, detail, intake_context, request_token)
  values (p_source, p_detail, p_intake_context, p_request_token)
  on conflict (request_token) where request_token is not null do nothing
  returning id into inserted_referral;

  -- A retry after a lost response is a no-op for the whole intake.
  if inserted_referral is null then return; end if;

  insert into public.email_subscribers
    (email, cohort, consented_at, unsubscribed_at)
  values (lower(p_email), p_cohort, now(), null)
  on conflict (email) do update set
    cohort = excluded.cohort,
    consented_at = excluded.consented_at,
    unsubscribed_at = null;
end;
$$;

revoke execute on function public.submit_beta_intake(uuid, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_beta_intake(uuid, text, text, text, text, text)
  to service_role;

create table if not exists public.beta_testimonials (
  id uuid primary key default gen_random_uuid(),
  submitted_at timestamptz not null default now(),
  quote text not null check (char_length(quote) between 40 and 600),
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  role text check (role is null or role in (
    'player', 'therapist', 'researcher', 'coach',
    'wellness_buyer', 'employer_benefits', 'other'
  )),
  attribution text not null check (attribution in ('anonymous', 'first_name', 'name_and_role')),
  public_consent boolean not null check (public_consent),
  check (attribution = 'anonymous' or display_name is not null)
);

create index if not exists beta_testimonials_submitted_at_idx
  on public.beta_testimonials (submitted_at desc);

alter table public.beta_testimonials enable row level security;

revoke all on table public.email_subscribers from anon, authenticated, public;
revoke all on table public.referral_responses from anon, authenticated, public;
revoke all on table public.beta_testimonials from anon, authenticated, public;

grant select, insert, update on table public.email_subscribers to service_role;
grant select, insert on table public.referral_responses to service_role;
grant select, insert on table public.beta_testimonials to service_role;
