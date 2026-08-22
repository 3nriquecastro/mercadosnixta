-- Mercados Nixta POS — Esquema de base de datos
-- Ejecutar una sola vez. Diseñado para un único negocio.

-- PRODUCTOS
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price numeric(10,2) not null default 0,
  tracks_inventory boolean not null default false,
  sort_order int not null default 0,
  active boolean not null default true,
  customization jsonb,
  created_at timestamptz not null default now()
);

-- VENTAS
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  payment_method text not null,
  total numeric(10,2) not null default 0,
  cash_received numeric(10,2),
  change_given numeric(10,2)
);

-- ARTÍCULOS DE VENTA
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id),
  product text not null,
  quantity int not null default 1,
  unit_price numeric(10,2) not null default 0,
  customization text,
  subtotal numeric(10,2) not null default 0,
  complimentary boolean not null default false
);

-- INVENTARIO (una fila por producto rastreado por día)
create table if not exists public.inventory (
  product_id uuid not null references public.products(id) on delete cascade,
  date date not null default current_date,
  opening_stock int not null default 0,
  current_stock int not null default 0,
  primary key (product_id, date)
);

create index if not exists sale_items_sale_id_idx on public.sale_items(sale_id);
create index if not exists sales_created_at_idx on public.sales(created_at);

-- RLS: negocio único, cualquier usuario autenticado tiene acceso completo
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.inventory enable row level security;

drop policy if exists "auth_all_products" on public.products;
drop policy if exists "auth_all_sales" on public.sales;
drop policy if exists "auth_all_sale_items" on public.sale_items;
drop policy if exists "auth_all_inventory" on public.inventory;

create policy "auth_all_products" on public.products for all to authenticated using (true) with check (true);
create policy "auth_all_sales" on public.sales for all to authenticated using (true) with check (true);
create policy "auth_all_sale_items" on public.sale_items for all to authenticated using (true) with check (true);
create policy "auth_all_inventory" on public.inventory for all to authenticated using (true) with check (true);
