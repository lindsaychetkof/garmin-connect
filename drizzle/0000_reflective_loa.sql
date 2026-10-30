CREATE TABLE `garmin_connections` (
	`user_id` text PRIMARY KEY NOT NULL,
	`encrypted_key` text NOT NULL,
	`snapshot` text,
	`fetched_at` text
);
