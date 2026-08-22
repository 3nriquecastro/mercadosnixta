-- Permite registrar productos y tickets completos como cortesía.
-- unit_price conserva el precio original; subtotal guarda lo realmente cobrado.

alter table public.sale_items
  add column if not exists unit_price numeric(10,2) not null default 0;

update public.sale_items
set unit_price = subtotal / quantity
where unit_price = 0 and subtotal > 0 and quantity > 0;

alter table public.sale_items
  add column if not exists complimentary boolean not null default false;
