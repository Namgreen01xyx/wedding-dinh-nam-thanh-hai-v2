-- Chạy trong Supabase > SQL Editor, cho dự án lưu lời chúc.
-- Dữ liệu công khai được mọi khách xem; khách chỉ được thêm lời chúc, không sửa/xóa.
create table if not exists public.wedding_wishes (
  id bigint generated always as identity primary key,
  name text not null check (char_length(trim(name)) between 1 and 60),
  message text not null check (char_length(trim(message)) between 1 and 300),
  created_at timestamptz not null default now()
);
alter table public.wedding_wishes enable row level security;
revoke all on public.wedding_wishes from anon, authenticated;
grant usage on schema public to anon;
grant select (name,message,created_at), insert (name,message) on public.wedding_wishes to anon;
-- Dùng policy tên duy nhất để tránh lỗi khi chạy lại.
drop policy if exists "wishes_public_read" on public.wedding_wishes;
drop policy if exists "wishes_public_insert" on public.wedding_wishes;
create policy "wishes_public_read" on public.wedding_wishes for select to anon using (true);
create policy "wishes_public_insert" on public.wedding_wishes for insert to anon with check (
  char_length(trim(name)) between 1 and 60
  and char_length(trim(message)) between 1 and 300
);
-- Khi có lời chúc spam, bạn có thể xóa thủ công trong Table Editor.
