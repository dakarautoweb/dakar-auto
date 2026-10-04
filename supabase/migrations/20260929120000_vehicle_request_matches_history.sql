-- Durable found-vehicle snapshots and a real audit trail for vehicle
-- sourcing requests. Public tracking continues to read through the
-- server-side service-role DAL; neither table is directly readable by anon.

create table public.vehicle_request_matches (
  id uuid primary key default gen_random_uuid(),
  vehicle_request_id uuid not null references public.vehicle_requests(id) on delete cascade,
  inventory_vehicle_id uuid references public.inventory_vehicles(id) on delete set null,
  make text not null,
  model text not null,
  year integer not null,
  price numeric,
  currency text not null,
  image_bucket text,
  image_path text,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_request_matches_make_not_blank check (btrim(make) <> ''),
  constraint vehicle_request_matches_model_not_blank check (btrim(model) <> ''),
  constraint vehicle_request_matches_year_check check (year between 1900 and 2100),
  constraint vehicle_request_matches_price_check check (price is null or price >= 0),
  constraint vehicle_request_matches_currency_not_blank check (btrim(currency) <> ''),
  constraint vehicle_request_matches_image_reference_check check (
    (image_bucket is null and image_path is null)
    or (
      image_bucket in ('inventory-vehicle-photos', 'vehicle-request-match-photos')
      and image_path is not null
      and btrim(image_path) <> ''
    )
  )
);

create index vehicle_request_matches_request_created_idx
  on public.vehicle_request_matches (vehicle_request_id, created_at desc);

create unique index vehicle_request_matches_one_current_idx
  on public.vehicle_request_matches (vehicle_request_id)
  where is_current;

create table public.vehicle_request_status_history (
  id uuid primary key default gen_random_uuid(),
  vehicle_request_id uuid not null references public.vehicle_requests(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  match_id uuid references public.vehicle_request_matches(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint vehicle_request_status_history_old_status_check check (
    old_status is null or old_status in (
      'request_received', 'on_treatment', 'vehicle_found',
      'direct_communication', 'closed', 'cancelled'
    )
  ),
  constraint vehicle_request_status_history_new_status_check check (
    new_status in (
      'request_received', 'on_treatment', 'vehicle_found',
      'direct_communication', 'closed', 'cancelled'
    )
  )
);

create index vehicle_request_status_history_request_created_idx
  on public.vehicle_request_status_history (vehicle_request_id, created_at);

create or replace function public.set_vehicle_request_match_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger vehicle_request_matches_set_updated_at
before update on public.vehicle_request_matches
for each row execute function public.set_vehicle_request_match_updated_at();

alter table public.vehicle_request_matches enable row level security;
alter table public.vehicle_request_status_history enable row level security;

create policy "Admins can read vehicle request matches"
  on public.vehicle_request_matches for select to authenticated
  using (public.is_admin());

create policy "Admins can read vehicle request status history"
  on public.vehicle_request_status_history for select to authenticated
  using (public.is_admin());

-- Authenticated admins can inspect snapshots and history, but cannot bypass
-- the atomic RPC with direct DML. The SECURITY DEFINER function below is the
-- only write path for both tables.
revoke all on public.vehicle_request_matches from anon, authenticated;
revoke all on public.vehicle_request_status_history from anon, authenticated;
grant select on public.vehicle_request_matches to authenticated;
grant select on public.vehicle_request_status_history to authenticated;

-- One transaction performs the match snapshot, status mutation and history
-- insert. The function re-reads inventory data under the authenticated admin
-- call, so the browser cannot forge an inventory snapshot.
create or replace function public.admin_update_vehicle_request_status(
  p_vehicle_request_id uuid,
  p_new_status text,
  p_inventory_vehicle_id uuid default null,
  p_manual_make text default null,
  p_manual_model text default null,
  p_manual_year integer default null,
  p_manual_price numeric default null,
  p_manual_currency text default null,
  p_manual_image_path text default null
)
returns table(changed boolean, match_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_status text;
  v_match_id uuid;
  v_make text;
  v_model text;
  v_year integer;
  v_price numeric;
  v_currency text;
  v_image_bucket text;
  v_image_path text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if p_new_status not in (
    'request_received', 'on_treatment', 'vehicle_found',
    'direct_communication', 'closed', 'cancelled'
  ) then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  select vr.status into v_old_status
  from public.vehicle_requests vr
  where vr.id = p_vehicle_request_id
  for update;

  if not found then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;

  if v_old_status = p_new_status then
    return query select false, null::uuid;
    return;
  end if;

  if p_new_status = 'vehicle_found' then
    if p_inventory_vehicle_id is not null then
      select iv.make, iv.model, iv.year, iv.price, iv.currency,
             case when photo.storage_path is null then null else 'inventory-vehicle-photos' end,
             photo.storage_path
        into v_make, v_model, v_year, v_price, v_currency, v_image_bucket, v_image_path
      from public.inventory_vehicles iv
      left join lateral (
        select ivp.storage_path
        from public.inventory_vehicle_photos ivp
        where ivp.vehicle_id = iv.id
        order by ivp.is_primary desc, ivp.sort_order asc, ivp.created_at asc
        limit 1
      ) photo on true
      where iv.id = p_inventory_vehicle_id;

      if not found then
        raise exception 'inventory_vehicle_not_found' using errcode = 'P0002';
      end if;
    else
      v_make := nullif(btrim(p_manual_make), '');
      v_model := nullif(btrim(p_manual_model), '');
      v_year := p_manual_year;
      v_price := p_manual_price;
      v_currency := nullif(btrim(p_manual_currency), '');

      if v_make is null or v_model is null or v_year is null or v_currency is null then
        raise exception 'manual_vehicle_incomplete' using errcode = '22023';
      end if;

      if p_manual_image_path is not null then
        -- The browser never supplies a bucket/path pair. The admin Server
        -- Action uploads through the service-role client into this fixed
        -- bucket, under a request-scoped random path. Requiring both that
        -- exact shape and an existing storage object prevents a direct RPC
        -- caller from turning an arbitrary bucket/path into a tracking URL.
        if p_manual_image_path !~ (
          '^requests/' || p_vehicle_request_id::text ||
          '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
        ) then
          raise exception 'invalid_manual_vehicle_image' using errcode = '22023';
        end if;

        if not exists (
          select 1
          from storage.objects stored_object
          where stored_object.bucket_id = 'vehicle-request-match-photos'
            and stored_object.name = p_manual_image_path
        ) then
          raise exception 'manual_vehicle_image_not_found' using errcode = 'P0002';
        end if;

        v_image_bucket := 'vehicle-request-match-photos';
        v_image_path := p_manual_image_path;
      end if;
    end if;

    update public.vehicle_request_matches
    set is_current = false
    where vehicle_request_id = p_vehicle_request_id and is_current;

    insert into public.vehicle_request_matches (
      vehicle_request_id, inventory_vehicle_id, make, model, year, price,
      currency, image_bucket, image_path, is_current
    ) values (
      p_vehicle_request_id, p_inventory_vehicle_id, v_make, v_model, v_year,
      v_price, v_currency, v_image_bucket, v_image_path, true
    ) returning id into v_match_id;
  end if;

  update public.vehicle_requests
  set status = p_new_status, updated_at = now()
  where id = p_vehicle_request_id;

  insert into public.vehicle_request_status_history (
    vehicle_request_id, old_status, new_status, changed_by, match_id
  ) values (
    p_vehicle_request_id, v_old_status, p_new_status, auth.uid(), v_match_id
  );

  return query select true, v_match_id;
end;
$$;

revoke all on function public.admin_update_vehicle_request_status(
  uuid, text, uuid, text, text, integer, numeric, text, text
) from public;
grant execute on function public.admin_update_vehicle_request_status(
  uuid, text, uuid, text, text, integer, numeric, text, text
) to authenticated;
