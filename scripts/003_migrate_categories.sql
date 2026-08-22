-- Migrar categorías antiguas a las 3 categorías del POS
update public.products set category = 'comida' where category in ('tacos', 'antojitos', 'platillos', 'complementos');
update public.products set category = 'para_llevar' where category in ('tortillas', 'para_llevar');
