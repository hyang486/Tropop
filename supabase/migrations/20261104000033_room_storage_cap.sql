-- Capacity option B (human FINAL 2026-11-14, planning/spec11-briefs/capacity-b.md), server half.
--
-- Join cap: no change. join_room (0008) and join_open_room (0031) lock the room row and refuse a join when
--   members >= the room's stored max_members (PT409 'This room is full.'). 0032 create_room stores at most 6 for a
--   Free host and 30 for a Plus host, so a 7th join on a Free host's room fails. Existing rooms keep their stored cap.
-- Storage cap per room by the HOST's plan: Free 1 GiB, Plus 5 GiB, the sum of the room's ready media size_bytes
--   (originals; size_bytes is copied from storage by media_integrity, so the client cannot understate it). The
--   50 MB per-file bucket limit stays. Checked in media_integrity:
--     - on INSERT (the upload is registered; Storage refuses bytes without this row): refused when ready bytes +
--       live pending declared bytes (uploading, < 1 hour old) + this declared size_bytes exceed the cap, or the room
--       is already at or over it;
--     - when a row becomes 'ready' (the authoritative check, size known): refused when used + this file > cap.
--   Ready transitions in one room are serialized by an advisory lock, so two parallel uploads cannot both pass.
--   Error: errcode PT507, message 'room_storage_full', detail 'This room is out of space.' (HTTP 507 via PostgREST).
--   A file refused at ->ready leaves its Storage object; room-janitor removes the room's whole folder at expiry.
--   Grandfathered: no data change. A room already over its cap keeps its media; it only cannot add more.

-- The storage cap of a room in bytes, from its host's current plan.
create function private.room_storage_cap(p_room_id uuid)
returns bigint
language sql stable security definer
set search_path = ''
as $$
  select case when private.user_plan(r.host_id) = 'plus' then 5368709120::bigint else 1073741824::bigint end
  from public.rooms r where r.id = p_room_id;
$$;
revoke execute on function private.room_storage_cap(uuid) from public, anon, authenticated;

-- Bytes a room uses: its ready media, optionally leaving one row out (the row being checked).
create function private.room_storage_used(p_room_id uuid, p_except uuid default null)
returns bigint
language sql stable security definer
set search_path = ''
as $$
  select coalesce(sum(m.size_bytes), 0)::bigint
  from public.media m
  where m.room_id = p_room_id and m.status = 'ready' and m.id is distinct from p_except;
$$;
revoke execute on function private.room_storage_used(uuid, uuid) from public, anon, authenticated;

-- media_integrity: 0015's body plus the room storage cap.
create or replace function private.media_integrity()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_prefix text := new.room_id::text || '/' || new.id::text || '/';
  v_size bigint;
begin
  if new.original_path not like v_prefix || '%'
     or (new.preview_path is not null and new.preview_path not like v_prefix || '%') then
    raise exception 'Media paths must be under {room_id}/{media_id}/' using errcode = '22023';
  end if;

  if tg_op = 'UPDATE' and old.status = 'ready' then
    if new.status is distinct from 'ready'
       or new.original_path is distinct from old.original_path
       or new.preview_path is distinct from old.preview_path
       or new.content_sha256 is distinct from old.content_sha256
       or new.uploader_id is distinct from old.uploader_id
       or new.room_id is distinct from old.room_id then
      raise exception 'A ready media item cannot be changed' using errcode = '42501';
    end if;
    new.size_bytes := old.size_bytes;
    return new;
  end if;

  -- Capacity B pre-check: registering an upload (the row must exist before Storage accepts the bytes) fails when
  -- ready bytes + live pending declared bytes + this declared size exceed the cap. A declared size is optional
  -- (null counts as 0, older clients) but must fit the 50 MB per-file limit. Pending rows older than 1 hour are
  -- treated as abandoned. The ->ready check below stays the authority.
  if tg_op = 'INSERT' then
    if new.size_bytes is not null and (new.size_bytes <= 0 or new.size_bytes > 52428800) then
      raise exception 'Declared size must be 1 byte to 50 MB' using errcode = '22023';
    end if;
    if private.room_storage_used(new.room_id)
       + (select coalesce(sum(m.size_bytes), 0) from public.media m
          where m.room_id = new.room_id and m.status = 'uploading' and m.created_at > now() - interval '1 hour')
       + coalesce(new.size_bytes, 0)
       > private.room_storage_cap(new.room_id)
       or private.room_storage_used(new.room_id) >= private.room_storage_cap(new.room_id) then
      raise exception 'room_storage_full' using errcode = 'PT507', detail = 'This room is out of space.';
    end if;
  end if;

  if new.status = 'ready' then
    select (o.metadata ->> 'size')::bigint into v_size
    from storage.objects o
    where o.bucket_id = 'room-media' and o.name = new.original_path;
    if v_size is null or v_size <= 0 then
      raise exception 'The original file is missing or empty' using errcode = '22023';
    end if;
    if new.preview_path is not null and not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'room-media' and o.name = new.preview_path
        and coalesce((o.metadata ->> 'size')::bigint, 0) > 0) then
      raise exception 'The preview file is missing or empty' using errcode = '22023';
    end if;
    -- Capacity B: one ready transition per room at a time, then used + this file must fit the host's cap.
    perform pg_advisory_xact_lock(hashtextextended('room_storage:' || new.room_id::text, 0));
    if private.room_storage_used(new.room_id, new.id) + v_size > private.room_storage_cap(new.room_id) then
      raise exception 'room_storage_full' using errcode = 'PT507', detail = 'This room is out of space.';
    end if;
    new.size_bytes := v_size;
  end if;
  return new;
end;
$$;
revoke all on function private.media_integrity() from public, anon, authenticated;
