-- Mercados Nixta POS
-- Esquema administrado por Supabase y permisos para dueño/vendedor.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('comida', 'bebidas', 'para_llevar')),
  price numeric(10,2) not null default 0 check (price >= 0),
  tracks_inventory boolean not null default false,
  sort_order integer not null default 0,
  active boolean not null default true,
  customization jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete restrict,
  payment_method text not null check (payment_method in ('efectivo', 'tarjeta', 'transferencia', 'mixto', 'cortesia')),
  total numeric(10,2) not null default 0 check (total >= 0),
  cash_received numeric(10,2),
  change_given numeric(10,2)
);

alter table public.sales
  add column if not exists created_by uuid default auth.uid() references auth.users(id) on delete restrict;

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id),
  product text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(10,2) not null default 0 check (unit_price >= 0),
  customization text,
  subtotal numeric(10,2) not null default 0 check (subtotal >= 0),
  complimentary boolean not null default false
);

alter table public.sale_items
  add column if not exists unit_price numeric(10,2) not null default 0,
  add column if not exists complimentary boolean not null default false;

create table if not exists public.inventory (
  product_id uuid not null references public.products(id) on delete cascade,
  date date not null default current_date,
  opening_stock integer not null default 0 check (opening_stock >= 0),
  current_stock integer not null default 0,
  primary key (product_id, date)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'seller' check (role in ('owner', 'seller')),
  display_name text,
  created_at timestamptz not null default now()
);

create index if not exists sale_items_sale_id_idx on public.sale_items(sale_id);
create index if not exists sales_created_at_idx on public.sales(created_at);
create index if not exists sales_created_by_created_at_idx on public.sales(created_by, created_at desc);
create index if not exists inventory_date_idx on public.inventory(date);

create or replace function public.business_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Mexico_City')::date;
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.can_access_sale(target_sale_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_owner() or exists (
    select 1
    from public.sales
    where id = target_sale_id
      and created_by = auth.uid()
      and (created_at at time zone 'America/Mexico_City')::date = public.business_today()
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (new.id, 'seller', coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, role, display_name)
select id, 'seller', coalesce(raw_user_meta_data ->> 'display_name', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;

alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.inventory enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "auth_all_products" on public.products;
drop policy if exists "auth_all_sales" on public.sales;
drop policy if exists "auth_all_sale_items" on public.sale_items;
drop policy if exists "auth_all_inventory" on public.inventory;

drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_owner_update" on public.profiles;
create policy "profiles_select"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_owner());
create policy "profiles_owner_update"
  on public.profiles for update to authenticated
  using (public.is_owner()) with check (public.is_owner());

drop policy if exists "products_select" on public.products;
drop policy if exists "products_owner_insert" on public.products;
drop policy if exists "products_owner_update" on public.products;
drop policy if exists "products_owner_delete" on public.products;
create policy "products_select"
  on public.products for select to authenticated using (true);
create policy "products_owner_insert"
  on public.products for insert to authenticated with check (public.is_owner());
create policy "products_owner_update"
  on public.products for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "products_owner_delete"
  on public.products for delete to authenticated using (public.is_owner());

drop policy if exists "sales_select" on public.sales;
drop policy if exists "sales_insert" on public.sales;
drop policy if exists "sales_update" on public.sales;
drop policy if exists "sales_owner_delete" on public.sales;
create policy "sales_select"
  on public.sales for select to authenticated
  using (
    public.is_owner()
    or (
      created_by = auth.uid()
      and (created_at at time zone 'America/Mexico_City')::date = public.business_today()
    )
  );
create policy "sales_insert"
  on public.sales for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid())
  );
create policy "sales_update"
  on public.sales for update to authenticated
  using (
    public.is_owner()
    or (
      created_by = auth.uid()
      and (created_at at time zone 'America/Mexico_City')::date = public.business_today()
    )
  )
  with check (
    public.is_owner()
    or (
      created_by = auth.uid()
      and (created_at at time zone 'America/Mexico_City')::date = public.business_today()
    )
  );
create policy "sales_owner_delete"
  on public.sales for delete to authenticated using (public.is_owner());

drop policy if exists "sale_items_select" on public.sale_items;
drop policy if exists "sale_items_insert" on public.sale_items;
drop policy if exists "sale_items_update" on public.sale_items;
drop policy if exists "sale_items_delete" on public.sale_items;
create policy "sale_items_select"
  on public.sale_items for select to authenticated
  using (public.can_access_sale(sale_id));
create policy "sale_items_insert"
  on public.sale_items for insert to authenticated
  with check (public.can_access_sale(sale_id));
create policy "sale_items_update"
  on public.sale_items for update to authenticated
  using (public.can_access_sale(sale_id)) with check (public.can_access_sale(sale_id));
create policy "sale_items_delete"
  on public.sale_items for delete to authenticated
  using (public.can_access_sale(sale_id));

drop policy if exists "inventory_select" on public.inventory;
drop policy if exists "inventory_insert" on public.inventory;
drop policy if exists "inventory_update" on public.inventory;
drop policy if exists "inventory_delete" on public.inventory;
create policy "inventory_select"
  on public.inventory for select to authenticated
  using (public.is_owner() or date = public.business_today());
create policy "inventory_insert"
  on public.inventory for insert to authenticated
  with check (public.is_owner() or date = public.business_today());
create policy "inventory_update"
  on public.inventory for update to authenticated
  using (public.is_owner() or date = public.business_today())
  with check (public.is_owner() or date = public.business_today());
create policy "inventory_delete"
  on public.inventory for delete to authenticated
  using (public.is_owner() or date = public.business_today());

grant execute on function public.business_today() to authenticated;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.can_access_sale(uuid) to authenticated;
