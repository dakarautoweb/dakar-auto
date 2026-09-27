-- Lost-request recovery: one challenge may cover several requests.
--
-- When contact + last name (+ the one discriminator question) still match
-- more than one request and they all share the same email, a single code
-- sent to that email verifies all of them, and the customer then picks
-- their request from the verified list — the server never guesses one.
--
-- request_refs: JSON array of {"kind": "parts" | "vehicle", "id": "<request id>"}.
-- request_kind / request_id keep pointing at the first covered request.
alter table public.request_recovery_challenges
  add column if not exists request_refs jsonb;

update public.request_recovery_challenges
  set request_refs = jsonb_build_array(jsonb_build_object('kind', request_kind, 'id', request_id))
  where request_refs is null;

alter table public.request_recovery_challenges
  alter column request_refs set not null;

alter table public.request_recovery_challenges
  drop constraint if exists request_recovery_challenges_request_refs_array;
alter table public.request_recovery_challenges
  add constraint request_recovery_challenges_request_refs_array
  check (jsonb_typeof(request_refs) = 'array' and jsonb_array_length(request_refs) between 1 and 10);

-- "Codes sent for this request in the last hour" limit (containment query).
create index if not exists request_recovery_challenges_request_refs_idx
  on public.request_recovery_challenges using gin (request_refs jsonb_path_ops);
