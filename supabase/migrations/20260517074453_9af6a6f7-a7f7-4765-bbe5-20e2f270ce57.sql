create or replace function public.get_user_recommendations(_user_id uuid, _limit int default 12)
returns setof public.products
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> _user_id then
    raise exception 'not authorized';
  end if;
  return query
  with user_events as (
    select pe.product_id, pe.weight, pe.created_at, p.category_id, p.tags
    from public.product_events pe
    join public.products p on p.id = pe.product_id
    where pe.user_id = _user_id
      and pe.product_id is not null
      and pe.created_at > now() - interval '90 days'
  ),
  cat_scores as (
    select category_id, sum(weight * exp(-extract(epoch from (now() - created_at))/ (60*60*24*14))) as score
    from user_events where category_id is not null group by category_id
  ),
  tag_scores as (
    select unnest(tags) as tag, sum(weight * exp(-extract(epoch from (now() - created_at))/ (60*60*24*14))) as score
    from user_events group by 1
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
  select s.id, s.name, s.description, s.price, s.discount_price, s.image_url, s.category_id, s.tags, s.rating, s.stock, s.trending, s.created_at
  from scored s
  order by s.rec_score desc nulls last, s.rating desc
  limit _limit;
end;
$$;

revoke execute on function public.get_user_recommendations(uuid, int) from anon;
grant execute on function public.get_user_recommendations(uuid, int) to authenticated;