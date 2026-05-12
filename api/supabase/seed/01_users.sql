-- Creates 10 synthetic test users with generated email addresses
-- Uses UUID generation, password encryption, and metadata creation
-- Ensures consistent user creation for testing purposes
INSERT INTO
    auth.users(
        instance_id,
        id,
        aud,
        ROLE,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    )(
        SELECT
            '00000000-0000-0000-0000-000000000000',
            uuid_generate_v4(),
            'authenticated',
            'authenticated',
            'user' || (ROW_NUMBER() OVER ())::text || '@example.com',
            crypt('password', gen_salt('bf')),
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP,
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object(
                'first_name',
                'User' || (ROW_NUMBER() OVER ())::text,   
                'last_name',
                'Example' || (ROW_NUMBER() OVER ())::text
            ),
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP,
            '',
            '',
            '',
            ''
        FROM
            generate_series(1, 10)
    );

-- Real developer account for local sign-in.
-- Password: 'password' (matches the synthetic users above).
INSERT INTO
    auth.users(
        instance_id,
        id,
        aud,
        ROLE,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    )
VALUES
    (
        '00000000-0000-0000-0000-000000000000',
        uuid_generate_v4(),
        'authenticated',
        'authenticated',
        'caleb@daymoon.dev',
        crypt('password', gen_salt('bf')),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('first_name', 'Caleb', 'last_name', 'Day'),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        '',
        '',
        '',
        ''
    );

-- Block 2: Create User Email Identities
-- Generates corresponding email identities for the created test users
-- Links user IDs with email-based authentication identities
-- Ensures each user has a complete authentication profile
INSERT INTO
    auth.identities(
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    )(
        SELECT
            uuid_generate_v4(),
            id,
            id,
            format('{"sub":"%s","email":"%s"}', id :: text, email) :: jsonb,
            'email',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        FROM
            auth.users
    );
