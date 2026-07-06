-- Computed leaderboard view.
-- Score formula (tunable): 10 pts per live launch, 2 pts per upvote received
-- on the user's products, 1 pt per (non-deleted) comment written.
CREATE OR REPLACE VIEW "leaderboard_entries" AS
SELECT
  u."id"                                   AS "user_id",
  u."name"                                 AS "name",
  u."avatar_url"                           AS "avatar_url",
  COALESCE(l.launches_count, 0)::int       AS "launches_count",
  COALESCE(uv.upvotes_received, 0)::int    AS "upvotes_received",
  COALESCE(c.comments_count, 0)::int       AS "comments_count",
  (COALESCE(l.launches_count, 0) * 10
   + COALESCE(uv.upvotes_received, 0) * 2
   + COALESCE(c.comments_count, 0))::int   AS "score"
FROM "users" u
LEFT JOIN (
  SELECT "maker_id", COUNT(*) AS launches_count
  FROM "products"
  WHERE "status" = 'LIVE'
  GROUP BY "maker_id"
) l ON l."maker_id" = u."id"
LEFT JOIN (
  SELECT p."maker_id", COUNT(*) AS upvotes_received
  FROM "upvotes" up
  JOIN "products" p ON p."id" = up."product_id"
  GROUP BY p."maker_id"
) uv ON uv."maker_id" = u."id"
LEFT JOIN (
  SELECT "user_id", COUNT(*) AS comments_count
  FROM "comments"
  WHERE "deleted_at" IS NULL
  GROUP BY "user_id"
) c ON c."user_id" = u."id";
