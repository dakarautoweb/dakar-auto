-- Root-cause fix for /admin/faq showing "No FAQ items yet" despite the
-- seed rows existing, and "Something went wrong while saving" on Add FAQ.
--
-- Same class of bug as 20260915090000_grant_site_settings_authenticated.sql:
-- the previous migration created public.faq_items and its RLS policies but
-- never ran the base-level GRANT. RLS policies only ever *restrict* access
-- that the underlying Postgres GRANT already allows — they never grant
-- access by themselves. With no GRANT, anon/authenticated had zero
-- privileges on this table, so every query failed with
-- "permission denied for table faq_items" before RLS was even evaluated.
-- Not an is_admin() bug and not a policy-logic bug — same conclusion as the
-- site_settings incident.
grant select on public.faq_items to anon, authenticated;
grant insert, update, delete on public.faq_items to authenticated;
