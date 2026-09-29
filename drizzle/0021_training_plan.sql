CREATE TABLE `trainer` (
    `id` text PRIMARY KEY NOT NULL,
    `user_id` text NOT NULL,
    `name` text NOT NULL,
    `color` text DEFAULT '#a3e635' NOT NULL,
    `schedule_json` text DEFAULT '{}' NOT NULL,
    `created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
    `updated_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `trainer_user_idx` ON `trainer` (`user_id`);
--> statement-breakpoint
CREATE TABLE `subscription` (
    `id` text PRIMARY KEY NOT NULL,
    `user_id` text NOT NULL,
    `trainer_id` text NOT NULL,
    `target_sessions` integer NOT NULL,
    `status` text DEFAULT 'active' NOT NULL,
    `started_at` integer NOT NULL,
    `completed_at` integer,
    `created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
    `updated_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `subscription_user_status_idx` ON `subscription` (`user_id`, `status`);
--> statement-breakpoint
CREATE INDEX `subscription_trainer_idx` ON `subscription` (`trainer_id`);
--> statement-breakpoint
CREATE TABLE `subscription_session` (
    `id` text PRIMARY KEY NOT NULL,
    `subscription_id` text NOT NULL,
    `workout_id` text,
    `start_at` integer NOT NULL,
    `end_at` integer NOT NULL,
    `status` text DEFAULT 'planned' NOT NULL,
    `created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
    `updated_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `subscription_session_subscription_idx` ON `subscription_session` (`subscription_id`);
--> statement-breakpoint
CREATE INDEX `subscription_session_workout_idx` ON `subscription_session` (`workout_id`);
--> statement-breakpoint
CREATE INDEX `subscription_session_start_idx` ON `subscription_session` (`start_at`);
--> statement-breakpoint
CREATE TABLE `work_schedule` (
    `user_id` text PRIMARY KEY NOT NULL,
    `config_json` text DEFAULT '{}' NOT NULL,
    `created_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL,
    `updated_at` integer DEFAULT (strftime('%s','now') * 1000) NOT NULL
);
