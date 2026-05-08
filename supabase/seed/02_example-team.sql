-- Delete the default team to make testing easier
DELETE FROM public.teams
WHERE id = get_team_id('User1''s Team');

-- Create the example team
INSERT INTO public.teams(name, created_by, updated_by)
    VALUES ('Example Team', get_user_id('user1@example.com'), get_user_id('user1@example.com'));

-- Add members
INSERT INTO public.team_users(team_id, user_id, created_by, updated_by)
    VALUES (get_team_id('Example Team'), get_user_id('user2@example.com'), get_user_id('user1@example.com'), get_user_id('user1@example.com')),
(get_team_id('Example Team'), get_user_id('user3@example.com'), get_user_id('user1@example.com'), get_user_id('user1@example.com')),
(get_team_id('Example Team'), get_user_id('user4@example.com'), get_user_id('user2@example.com'), get_user_id('user2@example.com')),
(get_team_id('Example Team'), get_user_id('caleb@daymoon.dev'), get_user_id('user1@example.com'), get_user_id('user1@example.com'));

-- Create example project
INSERT INTO public.projects(name, description, team_id, created_by, updated_by)
    VALUES ('Example Project', 'Demo project for testing social media integrations', get_team_id('Example Team'), get_user_id('user1@example.com'), get_user_id('user1@example.com'));

-- Insert social provider app credentials
INSERT INTO public.social_provider_app_credentials(project_id, provider, app_id, app_secret)
    VALUES (get_project_id('Example Project'), 'facebook', 'fb_app_123456789', 'fb_secret_abcdef123456'),
(get_project_id('Example Project'), 'instagram', 'ig_app_987654321', 'ig_secret_fedcba654321'),
(get_project_id('Example Project'), 'x', 'x_app_456789123', 'x_secret_789abc456def'),
(get_project_id('Example Project'), 'tiktok', 'tt_app_147258369', 'tt_secret_369cba852def'),
(get_project_id('Example Project'), 'youtube', 'yt_app_258369147', 'yt_secret_147def258abc'),
(get_project_id('Example Project'), 'pinterest', 'pin_app_369147258', 'pin_secret_258ghi369jkl'),
(get_project_id('Example Project'), 'linkedin', 'li_app_741852963', 'li_secret_963mno741pqr'),
(get_project_id('Example Project'), 'bluesky', 'bs_app_852963741', 'bs_secret_741stu852vwx'),
(get_project_id('Example Project'), 'threads', 'th_app_963741852', 'th_secret_852yza963bcd');

-- Insert social provider connections for Facebook
INSERT INTO public.social_provider_connections(project_id, provider, social_provider_user_id, social_provider_user_name, external_id, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, social_provider_profile_photo_url, social_provider_metadata)
    VALUES (get_project_id('Example Project'), 'facebook', 'fb_user_001', 'facebook_user_1', 'ext_fb_001', 'fb_access_token_001', 'fb_refresh_token_001', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '30 days', 'https://graph.facebook.com/fb_user_001/picture', '{"page_id": "123456789", "page_name": "Test Page 1"}'),
(get_project_id('Example Project'), 'facebook', 'fb_user_002', 'facebook_user_2', 'ext_fb_002', 'fb_access_token_002', 'fb_refresh_token_002', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '30 days', 'https://graph.facebook.com/fb_user_002/picture', '{"page_id": "987654321", "page_name": "Test Page 2"}'),
(get_project_id('Example Project'), 'facebook', 'fb_user_003', 'facebook_user_3', 'ext_fb_003', 'fb_access_token_003', 'fb_refresh_token_003', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '30 days', 'https://graph.facebook.com/fb_user_003/picture', '{"page_id": "456789123", "page_name": "Test Page 3"}'),
(get_project_id('Example Project'), 'facebook', 'fb_user_004', 'facebook_user_4', 'ext_fb_004', 'fb_access_token_004', 'fb_refresh_token_004', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '30 days', 'https://graph.facebook.com/fb_user_004/picture', '{"page_id": "789123456", "page_name": "Test Page 4"}'),
(get_project_id('Example Project'), 'facebook', 'fb_user_005', 'facebook_user_5', 'ext_fb_005', 'fb_access_token_005', 'fb_refresh_token_005', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '30 days', 'https://graph.facebook.com/fb_user_005/picture', '{"page_id": "321654987", "page_name": "Test Page 5"}');

-- Insert social provider connections for Instagram
INSERT INTO public.social_provider_connections(project_id, provider, social_provider_user_id, social_provider_user_name, external_id, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, social_provider_profile_photo_url, social_provider_metadata)
    VALUES (get_project_id('Example Project'), 'instagram', 'ig_user_001', 'insta_user_1', 'ext_ig_001', 'ig_access_token_001', 'ig_refresh_token_001', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '60 days', 'https://instagram.com/ig_user_001/picture.jpg', '{"business_account_id": "ig_business_001", "followers_count": 1500}'),
(get_project_id('Example Project'), 'instagram', 'ig_user_002', 'insta_user_2', 'ext_ig_002', 'ig_access_token_002', 'ig_refresh_token_002', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '60 days', 'https://instagram.com/ig_user_002/picture.jpg', '{"business_account_id": "ig_business_002", "followers_count": 2300}'),
(get_project_id('Example Project'), 'instagram', 'ig_user_003', 'insta_user_3', 'ext_ig_003', 'ig_access_token_003', 'ig_refresh_token_003', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '60 days', 'https://instagram.com/ig_user_003/picture.jpg', '{"business_account_id": "ig_business_003", "followers_count": 850}'),
(get_project_id('Example Project'), 'instagram', 'ig_user_004', 'insta_user_4', 'ext_ig_004', 'ig_access_token_004', 'ig_refresh_token_004', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '60 days', 'https://instagram.com/ig_user_004/picture.jpg', '{"business_account_id": "ig_business_004", "followers_count": 4200}'),
(get_project_id('Example Project'), 'instagram', 'ig_user_005', 'insta_user_5', 'ext_ig_005', 'ig_access_token_005', 'ig_refresh_token_005', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '60 days', 'https://instagram.com/ig_user_005/picture.jpg', '{"business_account_id": "ig_business_005", "followers_count": 980}');

-- Insert social provider connections for X (Twitter)
INSERT INTO public.social_provider_connections(project_id, provider, social_provider_user_id, social_provider_user_name, external_id, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, social_provider_profile_photo_url, social_provider_metadata)
    VALUES (get_project_id('Example Project'), 'x', 'x_user_001', 'twitter_user_1', 'ext_x_001', 'x_access_token_001', 'x_refresh_token_001', NOW() + INTERVAL '2 hours', NOW() + INTERVAL '7 days', 'https://pbs.twimg.com/profile_images/x_user_001.jpg', '{"username": "twitter_user_1", "verified": false, "followers_count": 1200}'),
(get_project_id('Example Project'), 'x', 'x_user_002', 'twitter_user_2', 'ext_x_002', 'x_access_token_002', 'x_refresh_token_002', NOW() + INTERVAL '2 hours', NOW() + INTERVAL '7 days', 'https://pbs.twimg.com/profile_images/x_user_002.jpg', '{"username": "twitter_user_2", "verified": true, "followers_count": 5600}'),
(get_project_id('Example Project'), 'x', 'x_user_003', 'twitter_user_3', 'ext_x_003', 'x_access_token_003', 'x_refresh_token_003', NOW() + INTERVAL '2 hours', NOW() + INTERVAL '7 days', 'https://pbs.twimg.com/profile_images/x_user_003.jpg', '{"username": "twitter_user_3", "verified": false, "followers_count": 890}'),
(get_project_id('Example Project'), 'x', 'x_user_004', 'twitter_user_4', 'ext_x_004', 'x_access_token_004', 'x_refresh_token_004', NOW() + INTERVAL '2 hours', NOW() + INTERVAL '7 days', 'https://pbs.twimg.com/profile_images/x_user_004.jpg', '{"username": "twitter_user_4", "verified": false, "followers_count": 3400}'),
(get_project_id('Example Project'), 'x', 'x_user_005', 'twitter_user_5', 'ext_x_005', 'x_access_token_005', 'x_refresh_token_005', NOW() + INTERVAL '2 hours', NOW() + INTERVAL '7 days', 'https://pbs.twimg.com/profile_images/x_user_005.jpg', '{"username": "twitter_user_5", "verified": true, "followers_count": 12000}');

-- Insert social provider connections for TikTok
INSERT INTO public.social_provider_connections(project_id, provider, social_provider_user_id, social_provider_user_name, external_id, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, social_provider_profile_photo_url, social_provider_metadata)
    VALUES (get_project_id('Example Project'), 'tiktok', 'tt_user_001', 'tiktok_user_1', 'ext_tt_001', 'tt_access_token_001', 'tt_refresh_token_001', NOW() + INTERVAL '24 hours', NOW() + INTERVAL '30 days', 'https://p16-sign-sg.tiktokcdn.com/tt_user_001.jpeg', '{"display_name": "TikTok User 1", "follower_count": 25000, "is_verified": false}'),
(get_project_id('Example Project'), 'tiktok', 'tt_user_002', 'tiktok_user_2', 'ext_tt_002', 'tt_access_token_002', 'tt_refresh_token_002', NOW() + INTERVAL '24 hours', NOW() + INTERVAL '30 days', 'https://p16-sign-sg.tiktokcdn.com/tt_user_002.jpeg', '{"display_name": "TikTok User 2", "follower_count": 45000, "is_verified": true}'),
(get_project_id('Example Project'), 'tiktok', 'tt_user_003', 'tiktok_user_3', 'ext_tt_003', 'tt_access_token_003', 'tt_refresh_token_003', NOW() + INTERVAL '24 hours', NOW() + INTERVAL '30 days', 'https://p16-sign-sg.tiktokcdn.com/tt_user_003.jpeg', '{"display_name": "TikTok User 3", "follower_count": 15000, "is_verified": false}'),
(get_project_id('Example Project'), 'tiktok', 'tt_user_004', 'tiktok_user_4', 'ext_tt_004', 'tt_access_token_004', 'tt_refresh_token_004', NOW() + INTERVAL '24 hours', NOW() + INTERVAL '30 days', 'https://p16-sign-sg.tiktokcdn.com/tt_user_004.jpeg', '{"display_name": "TikTok User 4", "follower_count": 35000, "is_verified": true}');

