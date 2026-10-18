-- ============================================================
--  ZZON 회원제 설정
--  Supabase → SQL Editor → New query 에 전부 붙여넣고 Run.
--  맨 아래 '초대 코드' 줄의 문구만 원하는 코드로 바꿔서 실행하세요.
--  여러 번 실행해도 안전해요 (이미 만든 건 유지됨).
--
--  등급: owner(쭌식) > prima(ARCH PRIMA) > vanguard(Vanguard) > acolyte(Acolyte)
--    acolyte  : 보기만
--    vanguard : + BGM 추가
--    prima    : + 페어 / 갤러리 편집
--    owner    : + World·사이트 정보 편집, BGM 삭제, 회원 등급 변경
-- ============================================================

-- ---------- 회원 ----------
create table if not exists public.members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'acolyte',
  email text,
  created_at timestamptz not null default now()
);
alter table public.members add column if not exists email text;
alter table public.members drop constraint if exists members_role_check;
update public.members set role = 'acolyte' where role not in ('owner', 'prima', 'vanguard', 'acolyte');
alter table public.members alter column role set default 'acolyte';
alter table public.members add constraint members_role_check check (role in ('owner', 'prima', 'vanguard', 'acolyte'));
alter table public.members enable row level security;

-- 초대 코드는 API 로 볼 수 없는 private 스키마에 보관
create schema if not exists private;
create table if not exists private.invite (code text not null);

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.members where user_id = auth.uid();
$$;

-- 등급 숫자: acolyte 1, vanguard 2, prima 3, owner 4 (회원 아니면 0)
create or replace function public.my_rank()
returns int language sql stable security definer set search_path = public as $$
  select coalesce((
    select case role when 'owner' then 4 when 'prima' then 3 when 'vanguard' then 2 when 'acolyte' then 1 else 0 end
    from public.members where user_id = auth.uid()
  ), 0);
$$;

create or replace function public.is_member()
returns boolean language sql stable as $$ select public.my_rank() >= 1 $$;

create or replace function public.is_owner()
returns boolean language sql stable as $$ select public.my_rank() >= 4 $$;

-- 초대 코드가 맞으면 회원 등록. 가장 먼저 가입한 사람이 owner, 나머지는 acolyte
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
  r := case when exists (select 1 from public.members) then 'acolyte' else 'owner' end;
  insert into public.members (user_id, role, email) values (auth.uid(), r, auth.jwt() ->> 'email');
  return r;
end;
$$;

-- 회원 목록 / 등급 변경 (owner 전용)
create or replace function public.list_members()
returns table (user_id uuid, email text, role text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_owner() then
    raise exception 'owner only';
  end if;
  return query select m.user_id, m.email, m.role, m.created_at from public.members m order by m.created_at;
end;
$$;

create or replace function public.set_member_role(target uuid, new_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then
    raise exception 'owner only';
  end if;
  if new_role not in ('prima', 'vanguard', 'acolyte') then
    raise exception 'invalid role';
  end if;
  if exists (select 1 from public.members where user_id = target and role = 'owner') then
    raise exception 'cannot change owner';
  end if;
  update public.members set role = new_role where user_id = target;
end;
$$;

create or replace function public.remove_member(target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then
    raise exception 'owner only';
  end if;
  if exists (select 1 from public.members where user_id = target and role = 'owner') then
    raise exception 'cannot remove owner';
  end if;
  delete from public.members where user_id = target;
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
create policy "members read site" on public.site_data for select to authenticated using (public.my_rank() >= 1);
drop policy if exists "members insert site" on public.site_data;
create policy "members insert site" on public.site_data for insert to authenticated with check (public.my_rank() >= 1);
drop policy if exists "members update site" on public.site_data;
create policy "members update site" on public.site_data for update to authenticated using (public.my_rank() >= 3) with check (public.my_rank() >= 3);

-- World 와 사이트 정보는 owner 만 바꿀 수 있음
create or replace function public.guard_site_data()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    -- 첫 저장(예전 데이터 옮기기)은 회원 누구나 가능. 이미 있으면 막힘(primary key)
    return new;
  end if;
  if not public.is_owner() and (
    new.data -> 'world' is distinct from old.data -> 'world'
    or new.data -> 'site' is distinct from old.data -> 'site'
  ) then
    raise exception 'only the owner can edit world';
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
drop trigger if exists guard_site_data on public.site_data;
create trigger guard_site_data before insert or update on public.site_data
  for each row execute function public.guard_site_data();

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
create policy "members read bgm" on public.bgm for select to authenticated using (public.my_rank() >= 1);
drop policy if exists "members add bgm" on public.bgm;
create policy "members add bgm" on public.bgm for insert to authenticated with check (public.my_rank() >= 2 and added_by = auth.uid());
drop policy if exists "owner deletes bgm" on public.bgm;
create policy "owner deletes bgm" on public.bgm for delete to authenticated using (public.is_owner());

-- ---------- 권한 (비회원/비로그인은 아무것도 못 함) ----------
revoke all on public.members, public.site_data, public.bgm from anon, authenticated;
grant select, insert, update on public.site_data to authenticated;
grant select, insert, delete on public.bgm to authenticated;
revoke all on function
  public.join_with_code(text), public.my_role(), public.my_rank(), public.is_member(), public.is_owner(),
  public.list_members(), public.set_member_role(uuid, text), public.remove_member(uuid)
  from public, anon;
grant execute on function
  public.join_with_code(text), public.my_role(), public.my_rank(), public.is_member(), public.is_owner(),
  public.list_members(), public.set_member_role(uuid, text), public.remove_member(uuid)
  to authenticated;

-- ---------- 이미지 / 음악 파일 저장소 (비공개) ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 52428800)
on conflict (id) do update set public = false;

drop policy if exists "members read media" on storage.objects;
create policy "members read media" on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.my_rank() >= 1);
drop policy if exists "members upload media" on storage.objects;
create policy "members upload media" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (
    public.my_rank() >= 2 and name like 'bgm/%'         -- Vanguard 이상: 음악
    or public.my_rank() >= 3                            -- ARCH PRIMA 이상: 이미지
    or (public.my_rank() >= 1 and name like 'images/%' and not exists (select 1 from public.site_data)) -- 첫 데이터 옮기기
  ));
drop policy if exists "owner deletes media" on storage.objects;
create policy "owner deletes media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_owner());

-- ---------- 초대 코드 ----------
-- 아래 '여기에-초대코드' 를 원하는 코드로 바꾸세요. (나중에 바꿀 때도 이 두 줄만 다시 실행)
delete from private.invite;
insert into private.invite (code) values ('zzunsiklovesrom');

-- API 가 새 함수/테이블을 바로 알아보도록 새로고침
notify pgrst, 'reload schema';
