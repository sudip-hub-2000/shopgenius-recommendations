
-- Extensions
create extension if not exists pg_trgm;

-- Roles enum
create type public.app_role as enum ('admin', 'user');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users can view own roles" on public.user_roles
  for select using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  image_url text,
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;
create policy "Categories are public" on public.categories for select using (true);
create policy "Admins manage categories" on public.categories for all
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null,
  discount_price numeric(10,2),
  image_url text not null,
  category_id uuid references public.categories(id) on delete set null,
  tags text[] not null default '{}',
  rating numeric(2,1) not null default 4.0,
  stock int not null default 100,
  trending boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.products enable row level security;
create policy "Products are public" on public.products for select using (true);
create policy "Admins manage products" on public.products for all
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create index products_name_trgm on public.products using gin (name gin_trgm_ops);
create index products_category_id_idx on public.products(category_id);

-- Cart
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  quantity int not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
alter table public.cart_items enable row level security;
create policy "Cart owner select" on public.cart_items for select using (auth.uid() = user_id);
create policy "Cart owner insert" on public.cart_items for insert with check (auth.uid() = user_id);
create policy "Cart owner update" on public.cart_items for update using (auth.uid() = user_id);
create policy "Cart owner delete" on public.cart_items for delete using (auth.uid() = user_id);

-- Wishlist
create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
alter table public.wishlist_items enable row level security;
create policy "Wishlist owner select" on public.wishlist_items for select using (auth.uid() = user_id);
create policy "Wishlist owner insert" on public.wishlist_items for insert with check (auth.uid() = user_id);
create policy "Wishlist owner delete" on public.wishlist_items for delete using (auth.uid() = user_id);

-- Search history
create table public.search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  query text not null,
  created_at timestamptz not null default now()
);
alter table public.search_history enable row level security;
create policy "History owner select" on public.search_history for select using (auth.uid() = user_id);
create policy "History owner insert" on public.search_history for insert with check (auth.uid() = user_id);
