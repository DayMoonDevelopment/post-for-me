create view public.v_tiktok_verification_files as
select
  bucket_id,
  name,
  user_metadata->>'project_id' as project_id
from storage.objects
where 
  user_metadata->>'project_id' is not null
  and metadata->>'mimetype' like 'text/%'
  and name like 'tiktok%';