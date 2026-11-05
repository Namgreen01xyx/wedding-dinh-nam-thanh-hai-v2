-- CHẠY MỘT LẦN trong Supabase > SQL Editor, SAU SQL tạo bảng trước đó.
-- Không cho phép một người xóa lời chúc của người khác.
-- Mỗi lời chúc mới nhận mã thu hồi ngẫu nhiên, chỉ trình duyệt gửi lưu mã đó.
-- Các lời chúc cũ (chưa có mã) vẫn xem được, nhưng không có nút thu hồi.
create table if not exists public.wedding_wishes (
  id bigint generated always as identity primary key,
  name text not null,
  message text not null,
  created_at timestamptz not null default now()
);
alter table public.wedding_wishes add column if not exists withdraw_key_hash text;
alter table public.wedding_wishes enable row level security;
-- Công khai đọc ID/tên/nội dung/thời gian, không công khai mã thu hồi.
grant usage on schema public to anon;
revoke all on public.wedding_wishes from anon;
grant select (id,name,message,created_at) on public.wedding_wishes to anon;
-- Chỉ function chuyên dụng được thêm/xóa lời chúc, không cấp DELETE trực tiếp.
revoke insert,update,delete on public.wedding_wishes from authenticated;
drop policy if exists "wishes_public_insert" on public.wedding_wishes;
drop policy if exists "wishes_public_read" on public.wedding_wishes;
create policy "wishes_public_read" on public.wedding_wishes
  for select to anon using (true);

create or replace function public.post_wedding_wish(p_name text,p_message text,p_token text)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare v_id bigint;
begin
  if length(trim(p_name)) not between 1 and 60
     or length(trim(p_message)) not between 1 and 300
     or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid wish input';
  end if;
  insert into public.wedding_wishes (name,message,withdraw_key_hash)
  values (trim(p_name),trim(p_message),encode(sha256(convert_to(p_token,'UTF8')),'hex'))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.retract_wedding_wish(p_id bigint,p_token text)
returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return false; end if;
  delete from public.wedding_wishes
   where id=p_id and withdraw_key_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  return found;
end;
$$;
revoke all on function public.post_wedding_wish(text,text,text) from public;
revoke all on function public.retract_wedding_wish(bigint,text) from public;
grant execute on function public.post_wedding_wish(text,text,text) to anon;
grant execute on function public.retract_wedding_wish(bigint,text) to anon;
