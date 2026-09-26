-- Vehicle Inventory feature: vehicles Dakar Auto currently has in stock and
-- can list publicly at /vehicles, plus their photos. Independent of
-- vehicle-sourcing (public.vehicle_requests, "Trouver un véhicule") and of
-- VIN decoding — this is a separate catalog of vehicles Dakar Auto already
-- owns/has access to, not a customer-submitted request.
--
-- GRANTs are included in this same migration, not split into a follow-up
-- fix like 20260915090000_grant_site_settings_authenticated.sql and
-- 20260922110000_grant_faq_items_privileges.sql had to be — those were
-- root-cause fixes for tables that shipped without them. RLS policies only
-- ever *restrict* access that the underlying Postgres GRANT already allows;
-- without the GRANT, anon/authenticated have zero privileges on a table and
-- every query fails with "permission denied" before RLS is even evaluated.
create table if not exists public.inventory_vehicles (
  id uuid primary key default gen_random_uuid(),
  make text not null,
  model text not null,
  year integer not null,
  engine_displacement text,
  color text,
  mileage integer,
  description_fr text,
  description_en text,
  -- Equipment/options lists — jsonb string arrays (not text[]) so the admin
  -- form and public detail page can pass/receive plain JS arrays with no
  -- Postgres array-literal parsing on either side.
  options_fr jsonb not null default '[]'::jsonb,
  options_en jsonb not null default '[]'::jsonb,
  price numeric,
  currency text not null default 'CAD',
  transmission text,
  fuel_type text,
  vin text,
  status text not null default 'available',
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_vehicles_status_check check (status in ('available', 'reserved', 'sold', 'hidden')),
  constraint inventory_vehicles_year_check check (year between 1900 and 2100),
  constraint inventory_vehicles_mileage_check check (mileage is null or mileage >= 0),
  constraint inventory_vehicles_price_check check (price is null or price >= 0),
  constraint inventory_vehicles_options_fr_is_array check (jsonb_typeof(options_fr) = 'array'),
  constraint inventory_vehicles_options_en_is_array check (jsonb_typeof(options_en) = 'array')
);

-- Public listing/detail's own filter (status in ('available','reserved')),
-- newest/featured first — matches how getPublicVehicles orders.
create index if not exists inventory_vehicles_public_order_idx on public.inventory_vehicles (status, is_featured desc, created_at desc);
create index if not exists inventory_vehicles_make_model_idx on public.inventory_vehicles (make, model);

alter table public.inventory_vehicles enable row level security;

create policy "Public can read available or reserved vehicles"
  on public.inventory_vehicles
  for select
  to anon, authenticated
  using (status in ('available', 'reserved'));

create policy "Admins can read all vehicles"
  on public.inventory_vehicles
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can insert vehicles"
  on public.inventory_vehicles
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update vehicles"
  on public.inventory_vehicles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete vehicles"
  on public.inventory_vehicles
  for delete
  to authenticated
  using (public.is_admin());

grant select on public.inventory_vehicles to anon, authenticated;
grant insert, update, delete on public.inventory_vehicles to authenticated;

-- Vehicle photos: multiple per vehicle, one flagged primary, ordered by
-- sort_order for "move up/down" reordering (same admin UX as
-- src/services/faq/actions.ts's moveFaqItemAction rather than a
-- drag-and-drop library).
create table if not exists public.inventory_vehicle_photos (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.inventory_vehicles(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists inventory_vehicle_photos_vehicle_order_idx on public.inventory_vehicle_photos (vehicle_id, sort_order);

-- At most one primary photo per vehicle, enforced in the database rather
-- than only in application code — a partial unique index (is_primary is
-- only ever true in the indexed rows) rather than a plain unique index on
-- (vehicle_id, is_primary), which would also block having more than one
-- non-primary photo per vehicle.
create unique index if not exists inventory_vehicle_photos_one_primary_idx on public.inventory_vehicle_photos (vehicle_id) where is_primary;

alter table public.inventory_vehicle_photos enable row level security;

-- Public may read a photo only if its vehicle is itself publicly visible —
-- keeps the "public statuses only" rule in one place (the vehicles policy
-- above) instead of duplicating the status list here.
create policy "Public can read photos of public vehicles"
  on public.inventory_vehicle_photos
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.inventory_vehicles v
      where v.id = inventory_vehicle_photos.vehicle_id
        and v.status in ('available', 'reserved')
    )
  );

create policy "Admins can read all vehicle photos"
  on public.inventory_vehicle_photos
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can insert vehicle photos"
  on public.inventory_vehicle_photos
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update vehicle photos"
  on public.inventory_vehicle_photos
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete vehicle photos"
  on public.inventory_vehicle_photos
  for delete
  to authenticated
  using (public.is_admin());

grant select on public.inventory_vehicle_photos to anon, authenticated;
grant insert, update, delete on public.inventory_vehicle_photos to authenticated;
