-- ============================================================
-- Seed Script: 03_cms-categories.sql
-- CMS article categories. Captured from production snapshot.
-- ============================================================

INSERT INTO "cms"."categories" ("id", "slug", "name", "description", "created_at", "updated_at", "deleted_at") VALUES
	('cat_3idi40QLlh7LMIn3sM9mF', 'resources', 'Resources', NULL, '2026-04-22 14:37:09.341897+00', '2026-04-22 14:37:09.341897+00', NULL),
	('cat_h4EdiGZ3bFBa4O4dHm1O6', 'blog', 'Blog', '', '2026-04-22 14:37:09.352744+00', '2026-04-22 14:37:09.352744+00', NULL);
