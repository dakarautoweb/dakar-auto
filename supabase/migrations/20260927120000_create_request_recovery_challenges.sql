-- One-time verification challenges for the chat's "lost request" recovery
-- flow (src/services/request-recovery/). A row is created when a customer's
-- contact + last name match a request; the customer must then enter the
-- code emailed to the address on that request before anything about the
-- request (number, status, tracking link) is revealed.
--
-- Never stored here: the code itself (only an HMAC-SHA256 of it, keyed by
-- REQUEST_RECOVERY_SECRET and bound to the challenge id), the email/phone
-- or name the customer typed, or any request contents.
--
-- request_id is text rather than a foreign key because a challenge points
-- at either parts_requests or vehicle_requests (request_kind says which).
create table if not exists public.request_recovery_challenges (
  id uuid primary key,
  request_kind text not null check (request_kind in ('parts', 'vehicle')),
  request_id text not null,
  code_hash text not null,
  attempts integer not null default 0 check (attempts >= 0),
  send_count integer not null default 1 check (send_count >= 1),
  last_sent_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now()
);

-- "Codes sent for this request in the last hour" limit.
create index if not exists request_recovery_challenges_request_idx
  on public.request_recovery_challenges (request_kind, request_id, created_at);

-- Server-only table: RLS on with no policies, and no grants to the public
-- roles — only the service-role client used by the recovery endpoint can
-- read or write it.
alter table public.request_recovery_challenges enable row level security;
revoke all on public.request_recovery_challenges from anon, authenticated;

-- Housekeeping (optional, run periodically or from a cron): challenges are
-- useless an hour after they expire.
-- delete from public.request_recovery_challenges where expires_at < now() - interval '1 hour';
