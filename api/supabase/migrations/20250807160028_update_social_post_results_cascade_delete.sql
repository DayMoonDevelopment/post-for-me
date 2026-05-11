--
-- Update social_post_results foreign key constraint to use CASCADE delete
-- This replaces the previous SET NULL behavior which conflicts with the NOT NULL constraint

-- First, drop the existing foreign key constraint
ALTER TABLE public.social_post_results 
    DROP CONSTRAINT social_post_results_provider_connection_id_fkey;

-- Add the new foreign key constraint with CASCADE delete
ALTER TABLE public.social_post_results 
    ADD CONSTRAINT social_post_results_provider_connection_id_fkey 
    FOREIGN KEY (provider_connection_id) 
    REFERENCES social_provider_connections(id) 
    ON DELETE CASCADE;