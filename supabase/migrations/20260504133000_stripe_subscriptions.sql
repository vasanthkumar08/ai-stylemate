alter table public.users
  add column if not exists stripe_customer_id text,
  add column if not exists subscription_id text,
  add column if not exists subscription_status text default 'inactive'
    check (subscription_status in ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'));

create unique index if not exists users_stripe_customer_unique_idx
  on public.users (stripe_customer_id)
  where stripe_customer_id is not null and deleted_at is null;

create unique index if not exists users_subscription_unique_idx
  on public.users (subscription_id)
  where subscription_id is not null and deleted_at is null;

alter table public.revenue_placeholder
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_checkout_session_id text;

create index if not exists revenue_placeholder_stripe_subscription_idx
  on public.revenue_placeholder (stripe_subscription_id)
  where stripe_subscription_id is not null and deleted_at is null;

create unique index if not exists revenue_placeholder_checkout_session_unique_idx
  on public.revenue_placeholder (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null and deleted_at is null;
