
-- Seed admin user (idempotent)
do $$
declare
  v_uid uuid;
begin
  select id into v_uid from auth.users where email = 'pupupakhi3@gmail.com';
  if v_uid is null then
    v_uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      'pupupakhi3@gmail.com', crypt('pupu007', gen_salt('bf')),
      now(), now(), now(),
      jsonb_build_object('provider','email','providers', jsonb_build_array('email')),
      jsonb_build_object('display_name','TechNova Admin'),
      false, '', '', '', ''
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_uid, jsonb_build_object('sub', v_uid::text, 'email','pupupakhi3@gmail.com'), 'email', v_uid::text, now(), now(), now());
  end if;

  insert into public.profiles (id, display_name)
  values (v_uid, 'TechNova Admin')
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (v_uid, 'admin')
  on conflict do nothing;
end $$;

-- Admin view policies
create policy "Admins view all profiles" on public.profiles
  for select using (public.has_role(auth.uid(), 'admin'));

create policy "Admins view all orders" on public.orders
  for select using (public.has_role(auth.uid(), 'admin'));

create policy "Admins view all order items" on public.order_items
  for select using (public.has_role(auth.uid(), 'admin'));

create policy "Admins view all events" on public.product_events
  for select using (public.has_role(auth.uid(), 'admin'));

create policy "Admins view all roles" on public.user_roles
  for select using (public.has_role(auth.uid(), 'admin'));
