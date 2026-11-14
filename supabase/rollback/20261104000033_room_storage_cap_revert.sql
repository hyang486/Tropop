-- Revert of migration 0033. NOT a migration; apply by hand only on a rollback decision.
-- Destroys nothing: no table or row changes. Restores media_integrity as of 0015 and drops the two helpers.

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
    new.size_bytes := v_size;
  end if;
  return new;
end;
$$;
revoke all on function private.media_integrity() from public, anon, authenticated;

drop function private.room_storage_used(uuid, uuid);
drop function private.room_storage_cap(uuid);
