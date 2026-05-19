
create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  title text,
  body text,
  verified_purchase boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index idx_product_reviews_product on public.product_reviews(product_id, created_at desc);
create index idx_product_reviews_user on public.product_reviews(user_id);

alter table public.product_reviews enable row level security;

create policy "Reviews are public"
  on public.product_reviews for select using (true);

create policy "Users insert own reviews"
  on public.product_reviews for insert
  with check (auth.uid() = user_id);

create policy "Users update own reviews"
  on public.product_reviews for update
  using (auth.uid() = user_id);

create policy "Users delete own reviews"
  on public.product_reviews for delete
  using (auth.uid() = user_id);

create policy "Admins moderate reviews update"
  on public.product_reviews for update
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins moderate reviews delete"
  on public.product_reviews for delete
  using (public.has_role(auth.uid(), 'admin'));

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_reviews_touch
before update on public.product_reviews
for each row execute function public.touch_updated_at();

-- Auto-set verified_purchase if user actually bought it
create or replace function public.set_verified_purchase()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.user_id = new.user_id and oi.product_id = new.product_id
  ) then
    new.verified_purchase = true;
  end if;
  return new;
end; $$;

create trigger trg_reviews_verify
before insert or update on public.product_reviews
for each row execute function public.set_verified_purchase();

create or replace function public.get_product_review_stats(_product_id uuid)
returns table (
  avg_rating numeric,
  total int,
  count_1 int,
  count_2 int,
  count_3 int,
  count_4 int,
  count_5 int
)
language sql stable as $$
  select
    coalesce(round(avg(rating)::numeric, 2), 0) as avg_rating,
    count(*)::int as total,
    count(*) filter (where rating = 1)::int,
    count(*) filter (where rating = 2)::int,
    count(*) filter (where rating = 3)::int,
    count(*) filter (where rating = 4)::int,
    count(*) filter (where rating = 5)::int
  from public.product_reviews
  where product_id = _product_id;
$$;
