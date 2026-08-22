# Mercados Nixta POS

Punto de venta simple y rápido para mercados, ferias y food trucks.

## Desarrollo local

1. Copia `.env.example` como `.env.local`.
2. Completa la URL y la clave pública de tu proyecto de Supabase.
3. Instala las dependencias y ejecuta el servidor:

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

Sin `.env.local`, la aplicación entra en modo demo: muestra datos de ejemplo, pero no guarda cambios.

## Base de datos en Supabase

Las migraciones oficiales están en `supabase/migrations/`. La carpeta `scripts/` se conserva solamente como referencia de la primera versión.

En la integración de GitHub de Supabase:

1. Selecciona este repositorio.
2. Usa `.` como **Working directory**.
3. Usa `main` como rama de producción.
4. Activa **Deploy to production**.

Cuando un cambio llegue a `main`, Supabase aplicará las migraciones pendientes. Estas crean productos, ventas, artículos de venta, inventario, perfiles y los permisos por rol.

## Crear las dos cuentas

Primero aplica las migraciones. Después:

1. En Supabase abre **Authentication → Users**.
2. Crea manualmente la cuenta del dueño y la cuenta del vendedor.
3. En **Authentication → Providers → Email**, desactiva **Allow new users to sign up**. Así la aplicación solo permite iniciar sesión.
4. En **SQL Editor**, asigna los roles reemplazando los correos:

```sql
update public.profiles
set role = 'owner', display_name = 'Dueño'
where id = (select id from auth.users where email = 'dueno@ejemplo.com');

update public.profiles
set role = 'seller', display_name = 'Vendedor'
where id = (select id from auth.users where email = 'vendedor@ejemplo.com');
```

Cada usuario nuevo recibe el rol `seller` de forma predeterminada. Solo se debe elevar manualmente la cuenta del dueño.

## Permisos

- **Dueño:** consulta ventas de cualquier fecha y operador; administra productos e inventario.
- **Vendedor:** vende, administra el inventario de hoy y consulta o corrige únicamente sus propias ventas de hoy.
- **Sin sesión:** no puede entrar al sistema.

Los permisos están protegidos por Row Level Security dentro de PostgreSQL. Ocultar opciones en la pantalla no es la única protección.

## Verificación

```bash
npm run lint
npm run build
```

## Tecnologías

- [Next.js](https://nextjs.org/docs)
- [React](https://react.dev)
- [Supabase](https://supabase.com/docs)
