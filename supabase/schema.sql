-- Run once in Supabase → SQL Editor.
-- Already ran an older version of this file? Run these three lines first (deletes all invite data):
--   drop table if exists public.rsvps, public.comments, public.photos;
--   delete from storage.objects where bucket_id = 'photos';
--   delete from storage.buckets where id = 'photos';

-- One row per person who RSVPs. guest_id is a random id stored on that person's device.
create table public.rsvps (
  guest_id   text primary key check (guest_id ~ '^[a-f0-9]{32}$'),
  ticket_no  bigint generated always as identity unique,
  name       text not null check (char_length(name) between 1 and 60),
  phone      text not null default '',
  status     text not null check (status in ('yes', 'maybe', 'no')),
  dress      text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comments (
  id         bigint generated always as identity primary key,
  guest_id   text not null references public.rsvps on delete cascade,
  name       text not null,
  text       text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);

create table public.photos (
  id         bigint generated always as identity primary key,
  guest_id   text not null references public.rsvps on delete cascade,
  path       text not null unique,
  name       text not null,
  caption    text not null default '',
  created_at timestamptz not null default now()
);

-- RLS on with no policies: the public anon key can't read anything.
-- The Next.js server uses the secret key, which bypasses RLS.
alter table public.rsvps enable row level security;
alter table public.comments enable row level security;
alter table public.photos enable row level security;
grant all on public.rsvps, public.comments, public.photos to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Photo bucket: JPEG only, max 8 MB each. Files get random unguessable names.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 8388608, array['image/jpeg']);
