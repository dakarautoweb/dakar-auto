-- Global, single-row table for Dakar Auto's public contact/company info
-- (Admin -> Paramètres -> "Informations de l'entreprise"). The public site
-- (footer, homepage contact section, WhatsApp/phone/email CTAs) reads from
-- this table instead of hardcoded constants, so an admin can change a
-- number or hide a channel without a code deploy.
--
-- Deliberately NOT the same thing as an admin's own login identity
-- (public.admins.email / auth.users) — this is the business's *public*
-- contact info, unrelated to which address any given admin logs in with.
create table if not exists public.site_settings (
  -- Fixed singleton row (id = 1 always) — one global settings record, not
  -- one per admin/user.
  id integer primary key default 1,
  contact_email text,
  show_contact_email boolean not null default false,
  phone text,
  show_phone boolean not null default false,
  whatsapp text,
  show_whatsapp boolean not null default false,
  instagram_url text,
  show_instagram boolean not null default false,
  facebook_url text,
  show_facebook boolean not null default false,
  address text,
  show_address boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

alter table public.site_settings enable row level security;

-- Only admins (existing public.is_admin() SECURITY DEFINER check, already
-- used throughout this project — see src/services/admin/auth.ts) can read
-- or write the raw row, including whichever fields are currently toggled
-- hidden. There is deliberately no public SELECT policy on this table: the
-- public site never queries it directly (see get_public_site_settings()
-- below), so a hidden field's actual value is never reachable through the
-- anon key, not even by a direct REST call.
create policy "Admins can read site settings"
  on public.site_settings
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can update site settings"
  on public.site_settings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- The one seed row. All fields start empty/hidden — item 5 in the project
-- brief for this table explicitly says not to invent fake/placeholder
-- contact data; an admin must type in the real values and flip each
-- toggle on before anything appears publicly.
insert into public.site_settings (id)
values (1)
on conflict (id) do nothing;

-- The public site's only path to this table: returns exactly the fields
-- currently toggled visible (every hidden field comes back null), so
-- "hidden" is enforced in the database itself, not just by the calling
-- component choosing not to render it. SECURITY DEFINER lets it read the
-- table on the caller's behalf without granting anon/authenticated any
-- direct table privileges.
create or replace function public.get_public_site_settings()
returns table (
  contact_email text,
  phone text,
  whatsapp text,
  instagram_url text,
  facebook_url text,
  address text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    case when show_contact_email then contact_email else null end,
    case when show_phone then phone else null end,
    case when show_whatsapp then whatsapp else null end,
    case when show_instagram then instagram_url else null end,
    case when show_facebook then facebook_url else null end,
    case when show_address then address else null end
  from public.site_settings
  where id = 1;
$$;

grant execute on function public.get_public_site_settings() to anon, authenticated;
