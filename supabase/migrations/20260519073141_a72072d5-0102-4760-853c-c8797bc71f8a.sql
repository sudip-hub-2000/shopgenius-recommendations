
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

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
