-- Mercados Nixta POS — Productos iniciales
-- Categorías: comida | bebidas | para_llevar

insert into public.products (name, category, price, tracks_inventory, sort_order, active) values
  ('Tacos',             'comida',       20, false, 1,  true),
  ('Quesadillas',       'comida',       35, false, 2,  true),
  ('Chilaquiles rojos', 'comida',       75, false, 3,  true),
  ('Micheladas',        'bebidas',      60, true,  4,  true),
  ('Agua fresca',       'bebidas',      25, false, 5,  true),
  ('Guacamole',         'comida',       50, true,  6,  true),
  ('Totopos',           'comida',       30, false, 7,  true),
  ('Tortillas 500 g',   'para_llevar',  15, true,  8,  true),
  ('Tortillas 1 kg',    'para_llevar',  28, true,  9,  true),
  ('Vasos de agua',     'bebidas',       0, false, 10, false)
on conflict do nothing;

update public.products set customization = '{"label":"Carne","options":[{"label":"Carne","price_delta":0},{"label":"Cambio de carne","price_delta":0},{"label":"Extra de carne","price_delta":12}]}'::jsonb where name in ('Tacos', 'Chilaquiles rojos');
update public.products set customization = '{"label":"Preparación","options":[{"label":"Normal","price_delta":0},{"label":"Cruda","price_delta":0}]}'::jsonb where name = 'Micheladas';
