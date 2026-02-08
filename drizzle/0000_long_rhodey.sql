CREATE TABLE `captures` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`normalized_url` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`created_at` integer NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`error_message` text,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`artifact_dir` text NOT NULL,
	`screenshot_hash` text,
	`pdf_hash` text,
	`metadata_hash` text
);
