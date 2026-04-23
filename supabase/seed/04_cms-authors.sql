-- ============================================================
-- Seed Script: 04_cms-authors.sql
-- CMS article authors. Captured from production snapshot.
-- ============================================================

INSERT INTO "cms"."authors" ("id", "slug", "name", "image_url", "bio", "role", "socials", "created_at", "updated_at", "deleted_at") VALUES
	('aut_hB6y2AKPQoebx6clZRcP', 'caleb', 'Caleb Panza', 'https://images.marblecms.com/avatars/COUmrTGag-P9-kA6PZrIq.jpeg', NULL, 'Member', '[{"url": "https://x.com/CalebPanza", "platform": "x"}, {"url": "https://www.youtube.com/@calebpanza", "platform": "youtube"}, {"url": "https://www.linkedin.com/in/calebpanza/", "platform": "linkedin"}]', '2026-04-22 14:37:08.792416+00', '2026-04-22 14:37:08.792416+00', NULL),
	('aut_43a3EyBk4tvMJrYVvAMtS', 'matt', 'Matt Rothenberger', 'https://images.marblecms.com/avatars/sCrjx975EwCxeqq7Hyhez.jpeg', NULL, NULL, '[{"url": "https://www.linkedin.com/in/matthew-rothenberger-b07632b3/", "platform": "linkedin"}, {"url": "https://x.com/MisterMattRoth", "platform": "x"}]', '2026-04-22 14:37:08.957674+00', '2026-04-22 14:37:08.957674+00', NULL),
	('aut_9tU4ZC9TTwZW3Gov4uQyh', 'matthew-rothenberger-orfxVg', 'Matthew Rothenberger', 'https://images.marblecms.com/avatars/SzM_i1Yc2JVZK1wRnlYH8.png', NULL, 'Member', '[]', '2026-04-22 14:37:09.071249+00', '2026-04-22 14:37:09.071249+00', NULL);
