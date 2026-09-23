-- ============================================================
-- CHIGÜIRE CLUB — Base de datos en Supabase
-- Cómo usarlo: Supabase → SQL Editor → New query → pega TODO
-- este archivo → Run. Se puede ejecutar más de una vez sin
-- romper nada (salvo el catálogo inicial, que solo se carga
-- si la tabla está vacía).
-- ============================================================


-- ------------------------------------------------------------
-- 1. ADMINISTRADORES
-- Solo los usuarios que estén en esta tabla pueden editar.
-- ------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- Sin políticas: nadie puede leer esta tabla desde la web.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;


-- ------------------------------------------------------------
-- 2. PRODUCTOS
-- ------------------------------------------------------------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  price       numeric(10, 2) not null check (price >= 0),
  image       text,
  category    text not null check (category in ('Gamer', 'Geek', 'Comida', 'Animales', 'Retro')),
  size        text not null default 'Talla única',
  description text not null default '' check (char_length(description) <= 400),
  featured    boolean not null default false,
  emoji       text not null default '',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "Ver productos visibles" on public.products;
create policy "Ver productos visibles" on public.products
  for select to anon, authenticated
  using (active or public.is_admin());

drop policy if exists "Admin crea productos" on public.products;
create policy "Admin crea productos" on public.products
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admin edita productos" on public.products;
create policy "Admin edita productos" on public.products
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admin borra productos" on public.products;
create policy "Admin borra productos" on public.products
  for delete to authenticated
  using (public.is_admin());

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;


-- ------------------------------------------------------------
-- 3. PEDIDOS
-- Los visitantes solo pueden CREAR pedidos. El total, los
-- nombres y los precios los recalcula la base de datos con
-- los precios reales (nadie puede inventarse un precio).
-- ------------------------------------------------------------
create table if not exists public.orders (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique check (code ~ '^CC-[A-Z0-9]{5}$'),
  items      jsonb not null,
  total      numeric(10, 2) not null default 0,
  pairs      integer not null default 0,
  status     text not null default 'nuevo'
             check (status in ('nuevo', 'confirmado', 'pagado', 'enviado', 'entregado', 'cancelado')),
  created_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);

create or replace function public.orders_prepare()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  line      jsonb;
  prod      record;
  qty       integer;
  clean     jsonb := '[]'::jsonb;
  sum_total numeric := 0;
  sum_pairs integer := 0;
begin
  if jsonb_typeof(new.items) is distinct from 'array'
     or jsonb_array_length(new.items) = 0
     or jsonb_array_length(new.items) > 30 then
    raise exception 'Pedido inválido';
  end if;

  for line in select value from jsonb_array_elements(new.items) loop
    begin
      qty := least(greatest(coalesce((line ->> 'qty')::integer, 0), 0), 50);
      select p.id, p.name, p.price into prod
        from public.products p
       where p.id = (line ->> 'id')::uuid and p.active;
    exception when others then
      continue; -- línea con datos inválidos: se ignora
    end;

    continue when qty = 0 or prod.id is null;

    clean     := clean || jsonb_build_object('id', prod.id, 'name', prod.name, 'price', prod.price, 'qty', qty);
    sum_total := sum_total + prod.price * qty;
    sum_pairs := sum_pairs + qty;
  end loop;

  if sum_pairs = 0 then
    raise exception 'Pedido vacío';
  end if;

  new.items      := clean;
  new.total      := sum_total;
  new.pairs      := sum_pairs;
  new.status     := 'nuevo';
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists orders_prepare on public.orders;
create trigger orders_prepare
  before insert on public.orders
  for each row execute function public.orders_prepare();

alter table public.orders enable row level security;

drop policy if exists "Cualquiera crea pedidos" on public.orders;
create policy "Cualquiera crea pedidos" on public.orders
  for insert to anon, authenticated
  with check (true);

drop policy if exists "Admin ve pedidos" on public.orders;
create policy "Admin ve pedidos" on public.orders
  for select to authenticated
  using (public.is_admin());

drop policy if exists "Admin actualiza pedidos" on public.orders;
create policy "Admin actualiza pedidos" on public.orders
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admin borra pedidos" on public.orders;
create policy "Admin borra pedidos" on public.orders
  for delete to authenticated
  using (public.is_admin());

grant insert on public.orders to anon, authenticated;
grant select, update, delete on public.orders to authenticated;


-- ------------------------------------------------------------
-- 4. FOTOS (Supabase Storage)
-- Bucket público: cualquiera puede VER las fotos,
-- solo el admin puede subir, cambiar o borrar.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admin ve fotos" on storage.objects;
create policy "Admin ve fotos" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Admin sube fotos" on storage.objects;
create policy "Admin sube fotos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Admin cambia fotos" on storage.objects;
create policy "Admin cambia fotos" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Admin borra fotos" on storage.objects;
create policy "Admin borra fotos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());


-- ------------------------------------------------------------
-- 5. CATÁLOGO INICIAL (solo si la tabla está vacía)
-- Luego lo editas todo desde /admin.
-- ------------------------------------------------------------
insert into public.products (name, price, category, featured, emoji, description, created_at)
select v.name, v.price, v.category, v.featured, v.emoji, v.description, now() + (v.ord * interval '1 second')
from (values
  (1,  'Media Pac-Man',        8, 'Gamer',    true,  '👾', 'Waka waka waka. El clásico arcade en tus pies, para maratones de gaming o para ser el más cool del salón.'),
  (2,  'Media Pizza',          7, 'Comida',   true,  '🍕', 'Porque la pizza es amor. Diseño cheesy (literalmente) para los que viven de rodajas y sueñan con pepperoni.'),
  (3,  'Media Chigüire',       9, 'Animales', true,  '',   'El rey del llano en tus pies. Nuestra mascota y nuestro espíritu animal. 100% chigüiresco.'),
  (4,  'Media Space Invaders', 8, 'Gamer',    false, '👽', 'Defiende tus pies de la invasión alienígena. Pixel art directo desde los 80s a tu gaveta.'),
  (5,  'Media Tacos',          7, 'Comida',   false, '🌮', 'Los martes son de tacos, pero estas medias son para los 7 días de la semana.'),
  (6,  'Media VHS',            8, 'Retro',    true,  '📼', 'Rebobina al pasado. Para los que todavía recuerdan el videoclub. Retro cool máximo.'),
  (7,  'Media Cat Neon',       9, 'Animales', false, '🐱', 'Gatos y neón, la combinación perfecta de internet. Para los que duermen con su gato y viven en Discord.'),
  (8,  'Media Matrix',         8, 'Geek',     false, '💊', '¿Píldora roja o azul? Con estas medias ya no importa. Wake up, Neo.'),
  (9,  'Media Ramen',          7, 'Comida',   false, '🍜', 'El sustento del estudiante universitario, ahora en formato textil.'),
  (10, 'Media Floppy',         8, 'Retro',    false, '💾', '3.5 pulgadas de pura nostalgia. 1.44 MB de recuerdos en el corazón.'),
  (11, 'Media Alien',          9, 'Geek',     false, '🛸', 'La verdad está ahí fuera… y también en tus tobillos.'),
  (12, 'Media Dinosaurio',     8, 'Animales', false, '🦕', '65 millones de años después, el dinosaurio sigue siendo el rey. Ahora también de tu outfit.')
) as v(ord, name, price, category, featured, emoji, description)
where not exists (select 1 from public.products);


-- ------------------------------------------------------------
-- 6. HAZTE ADMIN (ejecutar DESPUÉS de crear tu usuario en
--    Authentication → Users). Cambia el correo y ejecuta solo
--    estas dos líneas:
-- ------------------------------------------------------------
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'tu-correo@ejemplo.com';
