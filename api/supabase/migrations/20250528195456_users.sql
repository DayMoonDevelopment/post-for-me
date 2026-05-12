---- Add a users table that sets the id to be a foreign key to the auth.users table
CREATE TABLE public.users (
  id UUID UNIQUE NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT
);

--
-- Create a row level security policy on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Any authenticated user can read user profiles" ON public.users
    FOR SELECT TO authenticated
        USING (true);

--
-- No user can update or insert a user record. public.users are automatically synced with auth.users
-- insert/update rows into public.users
CREATE FUNCTION public.handle_user_insert_trigger()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER 
VOLATILE
SET SEARCH_PATH = public, auth
AS $$
    BEGIN
        INSERT INTO public.users (
            id, 
            email, 
            first_name, 
            last_name
        )
        VALUES (
            NEW.id, 
            NEW.email, 
            NEW.raw_user_meta_data ->> 'first_name', 
            NEW.raw_user_meta_data ->> 'last_name'
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name;

        RETURN NULL; -- No need to return NEW in AFTER triggers
    END;
$$;

CREATE TRIGGER on_auth_user_insert_or_update
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_user_insert_trigger();