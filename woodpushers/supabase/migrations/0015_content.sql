-- City intros and a workable reports queue. Idempotent.

-- Spec: the city page has an intro line. Editable from admin.
alter table cities add column if not exists intro text;

-- Reports need a lifecycle so admin can work the queue.
alter table reports add column if not exists status text not null default 'open'
  check (status in ('open','resolved'));

-- city_detail now returns the intro (return type changes: drop first).
drop function if exists city_detail(text);
create function city_detail(p_slug text)
returns table (
  id bigint, name text, country_code text, slug text, intro text,
  lng double precision, lat double precision,
  whatsapp_invite_url text
)
language sql stable as $$
  select c.id, c.name, c.country_code, c.slug, c.intro,
         st_x(c.location::geometry), st_y(c.location::geometry),
         cc.whatsapp_invite_url
  from cities c
  left join city_chats cc on cc.city_id = c.id
  where c.slug = p_slug;
$$;
grant execute on function city_detail(text) to anon, authenticated;
