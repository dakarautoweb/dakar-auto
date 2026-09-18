-- Archive (soft-hide) support for parts_requests and vehicle_requests.
--
-- archived_at is null for an active request and set to the archive
-- timestamp otherwise — never a delete, never a separate boolean (a
-- timestamp is strictly more useful: it also records *when* something was
-- archived, for free, and "active" stays a single canonical predicate:
-- archived_at IS NULL). Restoring a request just sets it back to null.
--
-- Nothing else about a request changes when it's archived: status, status
-- history, tracking_token, notes all stay exactly as they are, so customer
-- tracking (which looks up by tracking_token only, never by archived_at)
-- and the existing status/email flows are completely unaffected.
alter table public.parts_requests add column if not exists archived_at timestamptz null;
alter table public.vehicle_requests add column if not exists archived_at timestamptz null;

-- Every admin list/count query filters on archived_at (IS NULL for the
-- default "Active" view) — index it on both tables so that filter stays
-- cheap as the tables grow.
create index if not exists parts_requests_archived_at_idx on public.parts_requests (archived_at);
create index if not exists vehicle_requests_archived_at_idx on public.vehicle_requests (archived_at);
