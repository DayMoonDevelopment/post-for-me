-- ============================================================
-- Seed Script: 05_cms-tags.sql
-- CMS article tags. Captured from production snapshot.
-- ============================================================

INSERT INTO "cms"."tags" ("id", "slug", "name", "description", "created_at", "updated_at", "deleted_at") VALUES
	('tag_vN3g7sS9nKizYr3Evghsk', 'social-media-platforms', 'Social Media Platforms', '', '2026-04-22 14:37:09.593519+00', '2026-04-22 14:37:09.593519+00', NULL),
	('tag_6WhLY6DdUQJBbV0ePZ7J', 'getting-started', 'Getting Started', '', '2026-04-22 14:37:09.602499+00', '2026-04-22 14:37:09.602499+00', NULL),
	('tag_p2TgjSoziuheTI2md1pAI', 'troubleshooting', 'Troubleshooting', 'Tips & Tricks to work through common issues', '2026-04-22 14:37:09.607474+00', '2026-04-22 14:37:09.607474+00', NULL);
