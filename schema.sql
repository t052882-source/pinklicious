-- ==========================================================================
-- PINKLICIOUS — the whole backend, in one file.
--
-- This is the schema as it runs on the live project. Create a fresh Supabase
-- project, paste this into the SQL editor, and you have the same backend:
-- the menu, accounts, orders, the star ledger and every access rule.
--
-- Afterwards, put the project URL and the publishable key at the top of
-- js/db.js and the site talks to it.
--
-- The shape of it:
--
--   products       the menu, and the only place a price is true
--   members        one row per account, created by a signup trigger
--   orders         one row per order, total worked out in the database
--   order_items    the lines, priced from products
--   star_ledger    append-only. A balance is sum(stars)
--   member_stats   the view the member card and the counter both read
--   staff_invites  emails allowed onto the counter, listed before they sign up
--
--   place_order(items)         the only way an order is ever created
--   redeem_free_matcha(member) staff tick off a free eighth matcha
--
-- Row level security is on everywhere, default deny. A member reads their own
-- rows and nothing else; orders, order_items, star_ledger and products take no
-- writes at all through the API; on members only name and phone are writable,
-- so nobody can promote themselves to staff or hand themselves free matchas.
-- ==========================================================================

-- ==========================================================================
-- 1. TABLES
-- ==========================================================================

-- ---------- the menu, and the only place a price is true ----------
create table public.products (
  id          text primary key,
  name        text not null,
  category    text not null check (category in ('matcha','coffee','sweet','shop')),
  price_kd    numeric(8,3) not null check (price_kd > 0),
  is_drink    boolean not null default false,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
comment on table public.products is
  'The menu. Order prices are always read from here, never from the browser.';

-- ---------- one row per signed-up member ----------
create table public.members (
  id             uuid primary key references auth.users(id) on delete cascade,
  name           text,
  phone          text,
  is_staff       boolean not null default false,
  total_drinks   integer not null default 0 check (total_drinks >= 0),
  free_redeemed  integer not null default 0 check (free_redeemed >= 0),
  joined_at      timestamptz not null default now()
);
comment on column public.members.total_drinks is
  'Every drink ever bought. Every eighth one is free.';

-- ---------- orders ----------
create table public.orders (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references public.members(id) on delete cascade,
  total_kd     numeric(8,3) not null check (total_kd >= 0),
  drink_count  integer not null default 0 check (drink_count >= 0),
  placed_at    timestamptz not null default now()
);
create index orders_member_idx on public.orders (member_id, placed_at desc);

create table public.order_items (
  id             bigserial primary key,
  order_id       uuid not null references public.orders(id) on delete cascade,
  product_id     text not null references public.products(id),
  item_name      text not null,
  item_option    text,
  unit_price_kd  numeric(8,3) not null,
  qty            integer not null check (qty > 0 and qty <= 50),
  is_drink       boolean not null default false
);
create index order_items_order_idx on public.order_items (order_id);

-- ---------- stars: append only, the balance is the sum ----------
create table public.star_ledger (
  id          bigserial primary key,
  member_id   uuid not null references public.members(id) on delete cascade,
  order_id    uuid references public.orders(id) on delete cascade,
  stars       integer not null,
  reason      text not null,
  created_at  timestamptz not null default now()
);
create index star_ledger_member_idx on public.star_ledger (member_id, created_at desc);
comment on table public.star_ledger is
  'Never edited. A balance is sum(stars). Only the place_order function writes here.';

-- ---------- who gets the counter ----------
-- An email has to be on this list *before* it signs up.
-- Nobody can add themselves to it: no grants, no policies.
create table public.staff_invites (
  email      text primary key,
  note       text,
  added_at   timestamptz not null default now()
);


-- ==========================================================================
-- 2. TIERS
-- ==========================================================================

-- One star per dinar spent.
create or replace function public.stars_per_kd()
returns integer language sql immutable set search_path = '' as $$ select 1 $$;

-- The four tiers. Below the first star you are not in one yet.
create or replace function public.tier_of(stars integer)
returns text language sql immutable set search_path = '' as $$
  select case
    when stars >= 7500 then 'platinum'
    when stars >= 3500 then 'gold'
    when stars >=  800 then 'silver'
    when stars >=    1 then 'bronze'
    else 'start'
  end
$$;

create or replace function public.tier_threshold(tier text)
returns integer language sql immutable set search_path = '' as $$
  select case tier
    when 'platinum' then 7500
    when 'gold'     then 3500
    when 'silver'   then 800
    when 'bronze'   then 1
    else 0
  end
$$;


-- ==========================================================================
-- 3. SIGNING UP
-- ==========================================================================

-- A member row is created the moment someone signs up, and the invite list
-- decides whether they also get the counter.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.members (id, name, phone, is_staff)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), ''),
    exists (select 1 from public.staff_invites si
             where lower(si.email) = lower(new.email))
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Addresses on the invite list skip the email-confirmation step, so the shop's
-- own people sign up and are straight in. Everyone else confirms as normal.
create or replace function public.autoconfirm_invited()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is not null
     and new.email_confirmed_at is null
     and exists (select 1 from public.staff_invites si
                  where lower(si.email) = lower(new.email))
  then
    new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  end if;
  return new;
end $$;

create trigger autoconfirm_invited_users
  before insert on auth.users
  for each row execute function public.autoconfirm_invited();

-- Staff check, kept in a definer function so the members policy does not
-- have to read members and recurse.
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select m.is_staff from public.members m where m.id = auth.uid()), false)
$$;


-- ==========================================================================
-- 4. PLACING AN ORDER
--    The only way an order is ever created. The browser sends product ids
--    and quantities; prices come from products, the total is worked out
--    here, and the stars are written in the same transaction. Nothing the
--    customer sends can change how many stars they get.
-- ==========================================================================
create or replace function public.place_order(items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid          uuid := auth.uid();
  new_order    uuid;
  order_total  numeric(8,3) := 0;
  drinks       integer := 0;
  earned       integer := 0;
  line         jsonb;
  prod         public.products;
  line_qty     integer;
  balance      integer;
begin
  if uid is null then
    raise exception 'Sign in to the Pink Club before placing an order'
      using errcode = '42501';
  end if;
  if items is null or jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'An order needs at least one item' using errcode = '22023';
  end if;
  if jsonb_array_length(items) > 40 then
    raise exception 'That is too many lines for one order' using errcode = '22023';
  end if;

  insert into public.orders (member_id, total_kd, drink_count)
  values (uid, 0, 0)
  returning id into new_order;

  for line in select * from jsonb_array_elements(items) loop
    select * into prod
      from public.products
     where id = (line ->> 'product_id') and active
     limit 1;

    if prod.id is null then
      raise exception 'We do not sell "%"', coalesce(line ->> 'product_id', 'that')
        using errcode = '22023';
    end if;

    line_qty := coalesce((line ->> 'qty')::integer, 1);
    if line_qty < 1 or line_qty > 50 then
      raise exception 'Quantity must be between 1 and 50' using errcode = '22023';
    end if;

    insert into public.order_items
      (order_id, product_id, item_name, item_option, unit_price_kd, qty, is_drink)
    values
      (new_order, prod.id, prod.name,
       nullif(trim(coalesce(line ->> 'option', '')), ''),
       prod.price_kd, line_qty, prod.is_drink);

    order_total := order_total + (prod.price_kd * line_qty);
    if prod.is_drink then drinks := drinks + line_qty; end if;
  end loop;

  update public.orders
     set total_kd = order_total, drink_count = drinks
   where id = new_order;

  update public.members
     set total_drinks = total_drinks + drinks
   where id = uid;

  earned := floor(order_total * public.stars_per_kd())::integer;
  if earned > 0 then
    insert into public.star_ledger (member_id, order_id, stars, reason)
    values (uid, new_order, earned, 'Order of ' || to_char(order_total, 'FM990.000') || ' KD');
  end if;

  select coalesce(sum(s.stars), 0)::integer into balance
    from public.star_ledger s where s.member_id = uid;

  return jsonb_build_object(
    'order_id',     new_order,
    'total_kd',     order_total,
    'drink_count',  drinks,
    'stars_earned', earned,
    'stars',        balance,
    'tier',         public.tier_of(balance)
  );
end $$;


-- ==========================================================================
-- 5. THE CARD, AND THE FREE EIGHTH MATCHA
--    security_invoker keeps row level security in force through the view,
--    so it can never show one member another's stars.
-- ==========================================================================
create or replace view public.member_stats
with (security_invoker = true) as
select
  m.id,
  m.name,
  m.phone,
  m.is_staff,
  m.joined_at,
  m.total_drinks,
  m.free_redeemed,
  coalesce(s.stars, 0)                    as stars,
  public.tier_of(coalesce(s.stars, 0))    as tier,
  m.total_drinks % 8                      as stamps,
  (m.total_drinks / 8) - m.free_redeemed  as free_matchas_ready,
  coalesce(o.order_count, 0)              as order_count,
  coalesce(o.spent_kd, 0)                 as spent_kd,
  o.last_order_at
from public.members m
left join (
  select member_id, sum(stars)::integer as stars
    from public.star_ledger group by member_id
) s on s.member_id = m.id
left join (
  select member_id,
         count(*)::integer  as order_count,
         sum(total_kd)      as spent_kd,
         max(placed_at)     as last_order_at
    from public.orders group by member_id
) o on o.member_id = m.id;

-- Staff hand over a free matcha and tick it off here.
create or replace function public.redeem_free_matcha(member uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare ready integer;
begin
  if not public.is_staff() then
    raise exception 'Only staff can redeem a free matcha' using errcode = '42501';
  end if;

  select (m.total_drinks / 8) - m.free_redeemed into ready
    from public.members m where m.id = member for update;

  if ready is null then
    raise exception 'No such member' using errcode = '22023';
  end if;
  if ready < 1 then
    raise exception 'That member has no free matcha waiting' using errcode = '22023';
  end if;

  update public.members
     set free_redeemed = free_redeemed + 1
   where id = member;

  return jsonb_build_object('free_matchas_ready', ready - 1);
end $$;


-- ==========================================================================
-- 6. ROW LEVEL SECURITY
--    On everywhere, default deny, then the few things a signed-in member
--    or a staff member may actually do.
-- ==========================================================================
alter table public.products      enable row level security;
alter table public.members       enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;
alter table public.star_ledger   enable row level security;
alter table public.staff_invites enable row level security;

-- ---------- the menu is public ----------
create policy products_read_all on public.products
  for select to anon, authenticated using (active);

-- ---------- members ----------
create policy members_read_own on public.members
  for select to authenticated using (id = auth.uid());

create policy members_read_all_staff on public.members
  for select to authenticated using (public.is_staff());

create policy members_update_own on public.members
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- No insert policy: only the signup trigger creates member rows.
-- No delete policy: deleting the auth user cascades.

-- ---------- orders ----------
create policy orders_read_own on public.orders
  for select to authenticated using (member_id = auth.uid());

create policy orders_read_all_staff on public.orders
  for select to authenticated using (public.is_staff());

-- No insert policy: place_order() is the only way in, so a customer can
-- never write their own total and mint stars.

-- ---------- order items ----------
create policy order_items_read_own on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders o
             where o.id = order_items.order_id and o.member_id = auth.uid())
  );

create policy order_items_read_all_staff on public.order_items
  for select to authenticated using (public.is_staff());

-- ---------- the star ledger is read only, forever ----------
create policy star_ledger_read_own on public.star_ledger
  for select to authenticated using (member_id = auth.uid());

create policy star_ledger_read_all_staff on public.star_ledger
  for select to authenticated using (public.is_staff());

-- ---------- staff_invites: no policies at all ----------
-- Only handle_new_user(), which is security definer, ever reads it.


-- ==========================================================================
-- 7. GRANTS
--    Defence in depth. Row level security already refuses these, but with
--    no privilege at all the statement is rejected outright instead of
--    quietly touching nothing.
-- ==========================================================================

-- Nobody writes to the menu through the API.
revoke insert, update, delete, truncate on public.products from anon, authenticated;

-- Orders and their lines are only ever created by place_order().
revoke insert, update, delete, truncate on public.orders      from anon, authenticated;
revoke insert, update, delete, truncate on public.order_items from anon, authenticated;

-- The star ledger is append-only, and only place_order() appends.
revoke insert, update, delete, truncate on public.star_ledger from anon, authenticated;

-- Members: no inserting or deleting rows, and a member may edit their name
-- and phone and nothing else. Not is_staff, not total_drinks, not
-- free_redeemed — so nobody promotes themselves or hands themselves a free
-- matcha.
revoke insert, update, delete, truncate on public.members from anon, authenticated;
grant  update (name, phone) on public.members to authenticated;

-- The invite list is invisible to the API.
revoke all on public.staff_invites from anon, authenticated;

-- Signed-out visitors read the menu and nothing else.
revoke select on public.members      from anon;
revoke select on public.orders       from anon;
revoke select on public.order_items  from anon;
revoke select on public.star_ledger  from anon;
revoke select on public.member_stats from anon;

-- Functions.
revoke all on function public.handle_new_user()             from public, anon, authenticated;
revoke all on function public.autoconfirm_invited()         from public, anon, authenticated;
revoke all on function public.is_staff()                    from public, anon;
revoke all on function public.place_order(jsonb)            from public, anon;
revoke all on function public.redeem_free_matcha(uuid)      from public, anon;
grant execute on function public.is_staff()                 to authenticated;
grant execute on function public.place_order(jsonb)         to authenticated;
grant execute on function public.redeem_free_matcha(uuid)   to authenticated;


-- ==========================================================================
-- 8. THE MENU
--    Exactly as it is priced on the website.
--    Drinks 3.800 KD · cookies 2.000 · tin 5.000 · grippy 8.000
-- ==========================================================================
insert into public.products (id, name, category, price_kd, is_drink) values
  ('matcha-latte',                 'Matcha Latte',                  'matcha', 3.800, true),
  ('daydream-matcha',              'Daydream Matcha',               'matcha', 3.800, true),
  ('strawberry-shortcake-matcha',  'Strawberry Shortcake Matcha',   'matcha', 3.800, true),
  ('blueberry-matcha',             'Blueberry Matcha',              'matcha', 3.800, true),
  ('white-chocolate-matcha',       'White Chocolate Matcha',        'matcha', 3.800, true),
  ('cinnamon-bun-matcha',          'Cinnamon Bun Matcha',           'matcha', 3.800, true),
  ('harvest-chai-matcha',          'Harvest Chai Matcha',           'matcha', 3.800, true),
  ('shaken-vanilla-bean-matcha',   'Shaken Vanilla Bean Matcha',    'matcha', 3.800, true),
  ('blondie-matcha',               'Blondie Matcha',                'matcha', 3.800, true),

  ('daydream-latte',               'Daydream Latte',                'coffee', 3.800, true),
  ('cinnamon-bun-latte',           'Cinnamon Bun Latte',            'coffee', 3.800, true),
  ('harvest-chai-latte',           'Harvest Chai Latte',            'coffee', 3.800, true),
  ('blondie-latte',                'Blondie Latte',                 'coffee', 3.800, true),
  ('shaken-vanilla-cold-brew',     'Shaken Vanilla Bean Cold Brew', 'coffee', 3.800, true),

  ('cookie-choco-coco',            'Choco Coco',                    'sweet',  2.000, false),
  ('cookie-choc-chip',             'Chocolate Chip Cookie',         'sweet',  2.000, false),

  ('tin',                          'Ceremonial Matcha Tin 30g',     'shop',   5.000, false),
  ('grippy',                       'My Grippy Matcha',              'shop',   8.000, false)
on conflict (id) do update
  set name     = excluded.name,
      category = excluded.category,
      price_kd = excluded.price_kd,
      is_drink = excluded.is_drink,
      active   = true;


-- ==========================================================================
-- 9. WHO RUNS THE COUNTER
--    Add an email here BEFORE that person signs up.
-- ==========================================================================
insert into public.staff_invites (email, note) values
  ('retajmtalkandie@gmail.com', 'Owner'),
  ('t052882@coded.edu.kw',      'Owner')
on conflict (email) do nothing;
