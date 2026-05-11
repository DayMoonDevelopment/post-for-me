CREATE POLICY "Allow Authenticated to Insert Media" ON storage.objects
    FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'post-media');

CREATE POLICY "Allow Authenticated to Update Media" ON storage.objects
    FOR UPDATE TO authenticated
        USING (bucket_id = 'post-media');

