-- Event type enum
do $$ begin
  create type public.product_event_type as enum ('view','click','search','cart_add','wishlist_add','purchase');
exception when duplicate_object then null; end $$;

-- Events table
create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product_id uuid references public.products(id) on delete cascade,
  event_type public.product_event_type not null,
  query text,
  weight numeric not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists product_events_user_idx on public.product_events(user_id, created_at desc);
create index if not exists product_events_product_idx on public.product_events(product_id);
create index if not exists product_events_user_type_idx on public.product_events(user_id, event_type);

alter table public.product_events enable row level security;

create policy "Events owner select" on public.product_events
  for select using (auth.uid() = user_id);

create policy "Events owner insert" on public.product_events
  for insert with check (auth.uid() = user_id);

-- Recommendation function: scores products by user's category & tag affinity
create or replace function public.get_user_recommendations(_user_id uuid, _limit int default 12)
returns setof public.products
language sql
stable
security definer
set search_path = public
as $$
  with user_events as (
    select pe.product_id, pe.event_type, pe.weight, pe.created_at, p.category_id, p.tags
    from public.product_events pe
    join public.products p on p.id = pe.product_id
    where pe.user_id = _user_id
      and pe.product_id is not null
      and pe.created_at > now() - interval '90 days'
  ),
  cat_scores as (
    select category_id, sum(weight * exp(-extract(epoch from (now() - created_at))/ (60*60*24*14))) as score
    from user_events
    where category_id is not null
    group by category_id
  ),
  tag_scores as (
    select unnest(tags) as tag, sum(weight * exp(-extract(epoch from (now() - created_at))/ (60*60*24*14))) as score
    from user_events
    group by 1
  ),
  interacted as (
    select distinct product_id from user_events
    union
    select product_id from public.cart_items where user_id = _user_id
  ),
  scored as (
    select p.*,
      coalesce((select score from cat_scores cs where cs.category_id = p.category_id), 0) * 2
      + coalesce((select sum(ts.score) from tag_scores ts where ts.tag = any(p.tags)), 0)
      + (p.rating * 0.5)
      + case when p.trending then 1 else 0 end as rec_score
    from public.products p
    where p.id not in (select product_id from interacted where product_id is not null)
  )
  select id, name, description, price, discount_price, image_url, category_id, tags, rating, stock, trending, created_at
  from scored
  order by rec_score desc nulls last, rating desc
  limit _limit;
$$;

grant execute on function public.get_user_recommendations(uuid, int) to authenticated, anon;