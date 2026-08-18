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
  drop constraint if exists referral_responses_intake_context_check;
alter table public.referral_responses
  add constraint referral_responses_intake_context_check
  check (intake_context in ('signup', 'beta_gate'));

create index if not exists referral_responses_context_source_idx
  on public.referral_responses (intake_context, source, submitted_at desc);

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

