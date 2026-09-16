-- Run in a new Supabase project's SQL editor. No service key belongs in the website.
create table if not exists public.comments (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nickname text not null default '' check (char_length(nickname) <= 16),
  body text not null check (char_length(btrim(body)) between 1 and 300),
  created_at timestamptz not null default now()
);
create table if not exists public.likes (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.comments enable row level security;
alter table public.likes enable row level security;
revoke all on public.comments, public.likes from anon, authenticated;
grant select on public.comments to authenticated;
grant insert (user_id, nickname, body) on public.comments to authenticated;
grant usage, select on sequence public.comments_id_seq to authenticated;
grant select, delete on public.likes to authenticated;
grant insert (user_id) on public.likes to authenticated;
drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments for select to authenticated using (true);
drop policy if exists comments_own_insert on public.comments;
create policy comments_own_insert on public.comments for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists likes_own_read on public.likes;
create policy likes_own_read on public.likes for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists likes_own_insert on public.likes;
create policy likes_own_insert on public.likes for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists likes_own_delete on public.likes;
create policy likes_own_delete on public.likes for delete to authenticated using (user_id = (select auth.uid()));
create or replace function public.community_likes() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('count', (select count(*) from public.likes),
    'liked', exists(select 1 from public.likes where user_id = auth.uid()));
$$;
revoke all on function public.community_likes() from public, anon;
grant execute on function public.community_likes() to authenticated;
