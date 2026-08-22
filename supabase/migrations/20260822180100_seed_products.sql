-- Catálogo inicial. El filtro por nombre evita duplicados al migrar una base existente.
insert into public.products (name, category, price, tracks_inventory, sort_order, active, customization)
select *
from (
  values
    ('Tacos', 'comida', 20::numeric, false, 1, true, '{"label":"Carne","options":[{"label":"Carne","price_delta":0},{"label":"Cambio de carne","price_delta":0},{"label":"Extra de carne","price_delta":12}]}'::jsonb),
    ('Quesadillas', 'comida', 35::numeric, false, 2, true, null::jsonb),
    ('Chilaquiles rojos', 'comida', 75::numeric, false, 3, true, '{"label":"Carne","options":[{"label":"Carne","price_delta":0},{"label":"Cambio de carne","price_delta":0},{"label":"Extra de carne","price_delta":12}]}'::jsonb),
    ('Micheladas', 'bebidas', 60::numeric, true, 4, true, '{"label":"Preparación","options":[{"label":"Normal","price_delta":0},{"label":"Cruda","price_delta":0}]}'::jsonb),
    ('Agua fresca', 'bebidas', 25::numeric, false, 5, true, null::jsonb),
    ('Guacamole', 'comida', 50::numeric, true, 6, true, null::jsonb),
    ('Totopos', 'comida', 30::numeric, false, 7, true, null::jsonb),
    ('Tortillas 500 g', 'para_llevar', 15::numeric, true, 8, true, null::jsonb),
    ('Tortillas 1 kg', 'para_llevar', 28::numeric, true, 9, true, null::jsonb),
    ('Vasos de agua', 'bebidas', 0::numeric, false, 10, false, null::jsonb)
) as seed(name, category, price, tracks_inventory, sort_order, active, customization)
where not exists (
  select 1 from public.products where products.name = seed.name
);
