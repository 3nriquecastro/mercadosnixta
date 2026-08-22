-- Ajusta los productos iniciales que pueden manejar existencias.
-- Los productos nuevos se configuran desde Control > Productos.

update public.products
set tracks_inventory = false
where name in ('Tacos', 'Quesadillas', 'Chilaquiles rojos', 'Agua fresca', 'Totopos', 'Vasos de agua');

update public.products
set tracks_inventory = true
where name in ('Micheladas', 'Guacamole', 'Tortillas 500 g', 'Tortillas 1 kg');
