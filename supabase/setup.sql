-- ============================================================
--  ZZON 회원제 설정
--  Supabase → SQL Editor → New query 에 전부 붙여넣고 Run.
--  맨 아래 '초대 코드' 줄의 문구만 원하는 코드로 바꿔서 실행하세요.
-- ============================================================

-- ---------- 회원 ----------
create table if not exists public.members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'owner')),
  created_at timestamptz not null default now()
);
alter table public.members enable row level security;

-- 초대 코드는 API 로 볼 수 없는 private 스키마에 보관
create schema if not exists private;
create table if not exists private.invite (code text not null);

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.members where user_id = auth.uid();
$$;

create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid());
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid() and role = 'owner');
$$;

-- 초대 코드가 맞으면 회원 등록. 가장 먼저 가입한 사람이 owner 가 됨
create or replace function public.join_with_code(code text)
returns text language plpgsql security definer set search_path = public, private as $$
declare
  r text;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  select role into r from public.members where user_id = auth.uid();
  if r is not null then
    return r;
  end if;
  if not exists (select 1 from private.invite i where i.code = join_with_code.code) then
    raise exception 'invalid invite code';
  end if;
  r := case when exists (select 1 from public.members) then 'member' else 'owner' end;
  insert into public.members (user_id, role) values (auth.uid(), r);
  return r;
end;
$$;

-- ---------- 사이트 내용 (페어, 갤러리, 세계관) ----------
create table if not exists public.site_data (
  id text primary key default 'main',
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
alter table public.site_data enable row level security;

drop policy if exists "members read site" on public.site_data;
create policy "members read site" on public.site_data for select to authenticated using (public.is_member());
drop policy if exists "members insert site" on public.site_data;
create policy "members insert site" on public.site_data for insert to authenticated with check (public.is_member());
drop policy if exists "members update site" on public.site_data;
create policy "members update site" on public.site_data for update to authenticated using (public.is_member()) with check (public.is_member());

-- ---------- BGM ----------
create table if not exists public.bgm (
  id bigint generated always as identity primary key,
  title text not null,
  kind text not null check (kind in ('file', 'youtube')),
  src text not null,
  added_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.bgm enable row level security;

drop policy if exists "members read bgm" on public.bgm;
create policy "members read bgm" on public.bgm for select to authenticated using (public.is_member());
drop policy if exists "members add bgm" on public.bgm;
create policy "members add bgm" on public.bgm for insert to authenticated with check (public.is_member() and added_by = auth.uid());
drop policy if exists "owner deletes bgm" on public.bgm;
create policy "owner deletes bgm" on public.bgm for delete to authenticated using (public.is_owner());

-- ---------- 권한 (비회원/비로그인은 아무것도 못 함) ----------
revoke all on public.members, public.site_data, public.bgm from anon, authenticated;
grant select, insert, update on public.site_data to authenticated;
grant select, insert, delete on public.bgm to authenticated;
revoke all on function public.join_with_code(text), public.my_role(), public.is_member(), public.is_owner() from public, anon;
grant execute on function public.join_with_code(text), public.my_role(), public.is_member(), public.is_owner() to authenticated;

-- ---------- 이미지 / 음악 파일 저장소 (비공개) ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 52428800)
on conflict (id) do update set public = false;

drop policy if exists "members read media" on storage.objects;
create policy "members read media" on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.is_member());
drop policy if exists "members upload media" on storage.objects;
create policy "members upload media" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_member());
drop policy if exists "owner deletes media" on storage.objects;
create policy "owner deletes media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_owner());

-- ---------- 초대 코드 ----------
-- 아래 '여기에-초대코드' 를 원하는 코드로 바꾸세요. (나중에 바꿀 때도 이 두 줄만 다시 실행)
delete from private.invite;
insert into private.invite (code) values ('zzunsiklovesrom');
